import { TerraformResource, SecurityIssue } from '../types/terraform';
import hardeningRules from '../data/terraform_hardening_rules.json';

interface HardeningRule {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  provider: string;
  resource_type: string;
  check: string;
  example?: {
    compliant: string;
    non_compliant: string;
  };
  reference?: string[];
}

export class SecurityAnalyzer {
  private static hardeningRules: HardeningRule[] = hardeningRules.data;

  static analyzeResources(resources: TerraformResource[]): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    resources.forEach(resource => {
      // Apply rule-based analysis
      issues.push(...this.applyHardeningRules(resource));
      
      // Apply legacy analysis for backward compatibility
      issues.push(...this.analyzeResource(resource));
    });

    // Remove duplicates based on resource and issue type
    return this.deduplicateIssues(issues);
  }

  private static applyHardeningRules(resource: TerraformResource): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const resourceId = `${resource.type}.${resource.name}`;

    // Find applicable rules for this resource type
    const applicableRules = this.hardeningRules.filter(rule => 
      rule.resource_type === resource.type || rule.resource_type === 'all'
    );

    resource.instances.forEach((instance, index) => {
      const instanceId = `${resourceId}[${index}]`;
      
      applicableRules.forEach(rule => {
        const violation = this.checkRuleViolation(rule, resource.type, instance.attributes);
        if (violation) {
          issues.push({
            id: `${rule.id}-${instanceId}`,
            severity: rule.severity,
            category: this.mapCategory(rule.category),
            title: rule.title,
            description: rule.description,
            resource: instanceId,
            remediation: this.generateRemediation(rule),
            details: {
              ruleId: rule.id,
              check: rule.check,
              violationDetails: violation,
              references: rule.reference || []
            }
          });
        }
      });
    });

    return issues;
  }

  private static checkRuleViolation(rule: HardeningRule, resourceType: string, attributes: any): any {
    // Enhanced rule checking based on resource type and common patterns
    switch (resourceType) {
      case 'aws_s3_bucket':
        return this.checkS3Rules(rule, attributes);
      case 'aws_security_group':
      case 'aws_security_group_rule':
        return this.checkSecurityGroupRules(rule, attributes);
      case 'aws_iam_policy':
      case 'aws_iam_role_policy':
      case 'aws_iam_user_policy':
        return this.checkIAMRules(rule, attributes);
      case 'aws_instance':
        return this.checkEC2Rules(rule, attributes);
      case 'aws_db_instance':
        return this.checkRDSRules(rule, attributes);
      case 'aws_ebs_volume':
        return this.checkEBSRules(rule, attributes);
      default:
        return this.checkGenericRules(rule, attributes);
    }
  }

  private static checkS3Rules(rule: HardeningRule, attributes: any): any {
    const ruleId = rule.id;
    
    // S3 public access rules
    if (ruleId.includes('public') || rule.check.toLowerCase().includes('public')) {
      if (attributes.acl === 'public-read' || attributes.acl === 'public-read-write') {
        return { violation: 'public_acl', acl: attributes.acl };
      }
      if (attributes.website && !attributes.block_public_acls) {
        return { violation: 'public_website', website: attributes.website };
      }
    }

    // S3 encryption rules
    if (ruleId.includes('encrypt') || rule.check.toLowerCase().includes('encrypt')) {
      if (!attributes.server_side_encryption_configuration) {
        return { violation: 'no_encryption', encryption: null };
      }
    }

    // S3 versioning rules
    if (ruleId.includes('version') || rule.check.toLowerCase().includes('version')) {
      if (!attributes.versioning || !attributes.versioning[0]?.enabled) {
        return { violation: 'no_versioning', versioning: attributes.versioning };
      }
    }

    // S3 logging rules
    if (ruleId.includes('log') || rule.check.toLowerCase().includes('log')) {
      if (!attributes.logging) {
        return { violation: 'no_logging', logging: null };
      }
    }

    return null;
  }

  private static checkSecurityGroupRules(rule: HardeningRule, attributes: any): any {
    const ruleId = rule.id;

    // Check for overly permissive rules
    if (ruleId.includes('restrict') || rule.check.toLowerCase().includes('restrict')) {
      const rules = attributes.ingress || attributes.egress || [];
      const isRule = attributes.type === 'ingress' || attributes.type === 'egress';
      
      if (isRule && attributes.cidr_blocks?.includes('0.0.0.0/0')) {
        return { 
          violation: 'public_access', 
          cidr_blocks: attributes.cidr_blocks,
          port: attributes.from_port,
          protocol: attributes.protocol
        };
      }

      if (!isRule) {
        for (const sgRule of rules) {
          if (sgRule.cidr_blocks?.includes('0.0.0.0/0')) {
            return { 
              violation: 'public_access_in_group', 
              rule: sgRule,
              port: sgRule.from_port,
              protocol: sgRule.protocol
            };
          }
        }
      }
    }

    // Check for specific dangerous ports
    if (ruleId.includes('ssh') || ruleId.includes('rdp')) {
      const dangerousPorts = [22, 3389, 1433, 3306, 5432];
      const rules = attributes.ingress || [];
      
      for (const sgRule of rules) {
        if (dangerousPorts.includes(sgRule.from_port) && 
            sgRule.cidr_blocks?.includes('0.0.0.0/0')) {
          return { 
            violation: 'dangerous_port_exposed', 
            port: sgRule.from_port,
            protocol: sgRule.protocol
          };
        }
      }
    }

    return null;
  }

  private static checkIAMRules(rule: HardeningRule, attributes: any): any {
    const ruleId = rule.id;

    // Check for overly permissive policies
    if (ruleId.includes('privilege') || rule.check.toLowerCase().includes('privilege')) {
      try {
        const policy = typeof attributes.policy === 'string' 
          ? JSON.parse(attributes.policy) 
          : attributes.policy;
        
        if (policy?.Statement) {
          for (const statement of policy.Statement) {
            if (statement.Effect === 'Allow') {
              // Check for wildcard resources
              if (statement.Resource === '*' || 
                  (Array.isArray(statement.Resource) && statement.Resource.includes('*'))) {
                return { 
                  violation: 'wildcard_resource', 
                  statement: statement,
                  actions: statement.Action
                };
              }
              
              // Check for wildcard actions
              if (statement.Action === '*' || 
                  (Array.isArray(statement.Action) && statement.Action.includes('*'))) {
                return { 
                  violation: 'wildcard_action', 
                  statement: statement,
                  resources: statement.Resource
                };
              }

              // Check for admin-level permissions
              const adminActions = ['*', 'iam:*', 's3:*', 'ec2:*'];
              const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
              const hasAdminActions = actions.some(action => 
                adminActions.some(admin => action.includes(admin.replace('*', '')))
              );
              
              if (hasAdminActions && statement.Resource === '*') {
                return { 
                  violation: 'admin_permissions', 
                  statement: statement,
                  adminActions: actions.filter(action => 
                    adminActions.some(admin => action.includes(admin.replace('*', '')))
                  )
                };
              }
            }
          }
        }
      } catch (e) {
        // Policy parsing error
        return { violation: 'policy_parse_error', error: e.message };
      }
    }

    return null;
  }

  private static checkEC2Rules(rule: HardeningRule, attributes: any): any {
    const ruleId = rule.id;

    // Check for encryption
    if (ruleId.includes('encrypt') || rule.check.toLowerCase().includes('encrypt')) {
      if (attributes.root_block_device && !attributes.root_block_device[0]?.encrypted) {
        return { violation: 'unencrypted_root_volume', root_block_device: attributes.root_block_device };
      }
      
      if (attributes.ebs_block_device) {
        const unencryptedDevices = attributes.ebs_block_device.filter(device => !device.encrypted);
        if (unencryptedDevices.length > 0) {
          return { violation: 'unencrypted_ebs_volumes', unencrypted_devices: unencryptedDevices };
        }
      }
    }

    // Check for public IP assignment
    if (ruleId.includes('public') || rule.check.toLowerCase().includes('public')) {
      if (attributes.associate_public_ip_address === true) {
        return { violation: 'public_ip_assigned', public_ip: true };
      }
    }

    // Check for IMDSv2
    if (ruleId.includes('metadata') || rule.check.toLowerCase().includes('metadata')) {
      if (!attributes.metadata_options || 
          attributes.metadata_options[0]?.http_tokens !== 'required') {
        return { 
          violation: 'imdsv1_enabled', 
          metadata_options: attributes.metadata_options 
        };
      }
    }

    return null;
  }

  private static checkRDSRules(rule: HardeningRule, attributes: any): any {
    const ruleId = rule.id;

    // Check for encryption
    if (ruleId.includes('encrypt') || rule.check.toLowerCase().includes('encrypt')) {
      if (!attributes.storage_encrypted) {
        return { violation: 'storage_not_encrypted', storage_encrypted: false };
      }
    }

    // Check for public accessibility
    if (ruleId.includes('public') || rule.check.toLowerCase().includes('public')) {
      if (attributes.publicly_accessible === true) {
        return { violation: 'publicly_accessible', publicly_accessible: true };
      }
    }

    // Check for backup retention
    if (ruleId.includes('backup') || rule.check.toLowerCase().includes('backup')) {
      if (!attributes.backup_retention_period || attributes.backup_retention_period < 7) {
        return { 
          violation: 'insufficient_backup_retention', 
          backup_retention_period: attributes.backup_retention_period 
        };
      }
    }

    // Check for deletion protection
    if (ruleId.includes('deletion') || rule.check.toLowerCase().includes('deletion')) {
      if (!attributes.deletion_protection) {
        return { violation: 'deletion_protection_disabled', deletion_protection: false };
      }
    }

    return null;
  }

  private static checkEBSRules(rule: HardeningRule, attributes: any): any {
    const ruleId = rule.id;

    // Check for encryption
    if (ruleId.includes('encrypt') || rule.check.toLowerCase().includes('encrypt')) {
      if (!attributes.encrypted) {
        return { violation: 'volume_not_encrypted', encrypted: false };
      }
    }

    return null;
  }

  private static checkGenericRules(rule: HardeningRule, attributes: any): any {
    // Generic rule checking for other resource types
    const ruleCheck = rule.check.toLowerCase();
    
    // Common encryption checks
    if (ruleCheck.includes('encrypt')) {
      const encryptionFields = ['encrypted', 'encryption', 'kms_key_id', 'server_side_encryption'];
      const hasEncryption = encryptionFields.some(field => 
        attributes[field] !== undefined && attributes[field] !== false
      );
      
      if (!hasEncryption) {
        return { violation: 'encryption_not_configured', checked_fields: encryptionFields };
      }
    }

    // Common public access checks
    if (ruleCheck.includes('public')) {
      const publicFields = ['public', 'publicly_accessible', 'public_access'];
      const hasPublicAccess = publicFields.some(field => 
        attributes[field] === true
      );
      
      if (hasPublicAccess) {
        return { violation: 'public_access_enabled', public_fields: publicFields };
      }
    }

    return null;
  }

  private static generateRemediation(rule: HardeningRule): string {
    const baseRemediation = `Follow ${rule.title} best practices. `;
    
    if (rule.example?.compliant) {
      return baseRemediation + `Example compliant configuration: ${rule.example.compliant}`;
    }
    
    if (rule.reference && rule.reference.length > 0) {
      return baseRemediation + `Refer to: ${rule.reference[0]}`;
    }
    
    return baseRemediation + rule.check;
  }

  private static mapCategory(ruleCategory: string): 'public_exposure' | 'encryption' | 'access_control' | 'compliance' {
    const category = ruleCategory.toLowerCase();
    
    if (category.includes('public') || category.includes('exposure')) {
      return 'public_exposure';
    }
    if (category.includes('encrypt')) {
      return 'encryption';
    }
    if (category.includes('access') || category.includes('iam') || category.includes('privilege')) {
      return 'access_control';
    }
    
    return 'compliance';
  }

  private static deduplicateIssues(issues: SecurityIssue[]): SecurityIssue[] {
    const seen = new Set<string>();
    return issues.filter(issue => {
      const key = `${issue.resource}-${issue.category}-${issue.title}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  // Legacy analysis methods for backward compatibility
  private static analyzeResource(resource: TerraformResource): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const resourceId = `${resource.type}.${resource.name}`;

    resource.instances.forEach((instance, index) => {
      const instanceId = `${resourceId}[${index}]`;
      
      // Check for public exposure
      issues.push(...this.checkPublicExposure(instanceId, resource.type, instance.attributes));
      
      // Check for encryption
      issues.push(...this.checkEncryption(instanceId, resource.type, instance.attributes));
      
      // Check for access control
      issues.push(...this.checkAccessControl(instanceId, resource.type, instance.attributes));
    });

    return issues;
  }

  private static checkPublicExposure(resourceId: string, type: string, attributes: any): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Security group rules with 0.0.0.0/0
    if (type === 'aws_security_group' || type === 'aws_security_group_rule') {
      const rules = attributes.ingress || attributes.egress || [];
      const isRule = type === 'aws_security_group_rule';
      
      if (isRule && attributes.cidr_blocks?.includes('0.0.0.0/0')) {
        issues.push({
          id: `${resourceId}-public-access`,
          severity: 'high',
          category: 'public_exposure',
          title: 'Security Group Rule Allows Public Access',
          description: 'Security group rule allows inbound traffic from anywhere (0.0.0.0/0)',
          resource: resourceId,
          remediation: 'Restrict CIDR blocks to specific IP ranges or use security group references',
          details: { cidr_blocks: attributes.cidr_blocks, port: attributes.from_port }
        });
      }

      if (!isRule) {
        rules.forEach((rule: any, idx: number) => {
          if (rule.cidr_blocks?.includes('0.0.0.0/0')) {
            issues.push({
              id: `${resourceId}-rule-${idx}-public`,
              severity: rule.from_port === 22 || rule.from_port === 3389 ? 'critical' : 'high',
              category: 'public_exposure',
              title: 'Security Group Allows Public Access',
              description: `Security group rule allows ${rule.from_port === 22 ? 'SSH' : rule.from_port === 3389 ? 'RDP' : 'inbound'} traffic from anywhere`,
              resource: resourceId,
              remediation: 'Restrict CIDR blocks to specific IP ranges',
              details: rule
            });
          }
        });
      }
    }

    // S3 bucket public access
    if (type === 'aws_s3_bucket_public_access_block') {
      if (!attributes.block_public_acls || !attributes.block_public_policy) {
        issues.push({
          id: `${resourceId}-s3-public`,
          severity: 'high',
          category: 'public_exposure',
          title: 'S3 Bucket Allows Public Access',
          description: 'S3 bucket is not properly configured to block public access',
          resource: resourceId,
          remediation: 'Enable all public access block settings',
          details: attributes
        });
      }
    }

    return issues;
  }

  private static checkEncryption(resourceId: string, type: string, attributes: any): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // EBS volume encryption
    if (type === 'aws_ebs_volume' && !attributes.encrypted) {
      issues.push({
        id: `${resourceId}-encryption`,
        severity: 'medium',
        category: 'encryption',
        title: 'EBS Volume Not Encrypted',
        description: 'EBS volume is not encrypted at rest',
        resource: resourceId,
        remediation: 'Enable encryption by setting encrypted = true',
        details: { size: attributes.size, type: attributes.type }
      });
    }

    // RDS encryption
    if (type === 'aws_db_instance' && !attributes.storage_encrypted) {
      issues.push({
        id: `${resourceId}-db-encryption`,
        severity: 'high',
        category: 'encryption',
        title: 'RDS Instance Not Encrypted',
        description: 'RDS database instance is not encrypted at rest',
        resource: resourceId,
        remediation: 'Enable storage encryption by setting storage_encrypted = true',
        details: { engine: attributes.engine, instance_class: attributes.instance_class }
      });
    }

    // S3 bucket encryption
    if (type === 'aws_s3_bucket' && !attributes.server_side_encryption_configuration) {
      issues.push({
        id: `${resourceId}-s3-encryption`,
        severity: 'medium',
        category: 'encryption',
        title: 'S3 Bucket Not Encrypted',
        description: 'S3 bucket does not have server-side encryption configured',
        resource: resourceId,
        remediation: 'Configure server-side encryption with aws_s3_bucket_server_side_encryption_configuration',
        details: { bucket: attributes.bucket }
      });
    }

    return issues;
  }

  private static checkAccessControl(resourceId: string, type: string, attributes: any): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // Default VPC usage
    if (type === 'aws_default_vpc') {
      issues.push({
        id: `${resourceId}-default-vpc`,
        severity: 'low',
        category: 'access_control',
        title: 'Using Default VPC',
        description: 'Resource is using the default VPC which may not follow security best practices',
        resource: resourceId,
        remediation: 'Create a custom VPC with proper network segmentation',
        details: { cidr_block: attributes.cidr_block }
      });
    }

    // IAM policy analysis (simplified)
    if (type === 'aws_iam_policy' && attributes.policy) {
      try {
        const policy = typeof attributes.policy === 'string' ? JSON.parse(attributes.policy) : attributes.policy;
        if (policy.Statement?.some((stmt: any) => stmt.Effect === 'Allow' && stmt.Resource === '*')) {
          issues.push({
            id: `${resourceId}-overly-permissive`,
            severity: 'medium',
            category: 'access_control',
            title: 'Overly Permissive IAM Policy',
            description: 'IAM policy grants access to all resources (*)',
            resource: resourceId,
            remediation: 'Restrict policy to specific resources and follow principle of least privilege',
            details: { policy_name: attributes.name }
          });
        }
      } catch (e) {
        // Skip parsing errors
      }
    }

    return issues;
  }

  static calculateSecurityScore(issues: SecurityIssue[]): number {
    // Define severity weights - ensure all possible severities are covered
    const weights = { 
      critical: 25, 
      high: 15, 
      medium: 8, 
      low: 3 
    };
    
    // Filter out any issues with invalid severity and calculate total deduction
    const validIssues = issues.filter(issue => 
      issue.severity && weights.hasOwnProperty(issue.severity)
    );
    
    const totalDeduction = validIssues.reduce((sum, issue) => {
      const weight = weights[issue.severity] || 0; // Default to 0 if severity not found
      return sum + weight;
    }, 0);
    
    // Ensure score is between 0 and 100
    const score = Math.max(0, Math.min(100, 100 - totalDeduction));
    
    // Return a valid number, defaulting to 85 if calculation fails
    return isNaN(score) ? 85 : score;
  }
}