export interface TerraformState {
  version: number;
  terraform_version: string;
  serial: number;
  lineage: string;
  outputs: Record<string, any>;
  resources: TerraformResource[];
}

export interface TerraformResource {
  mode: string;
  type: string;
  name: string;
  provider: string;
  instances: ResourceInstance[];
}

export interface ResourceInstance {
  schema_version: number;
  attributes: Record<string, any>;
  depends_on?: string[];
  private?: string;
}

export interface SecurityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'public_exposure' | 'encryption' | 'access_control' | 'compliance';
  title: string;
  description: string;
  resource: string;
  remediation: string;
  details: Record<string, any>;
}

export interface ResourceDependency {
  source: string;
  target: string;
  type: 'explicit' | 'implicit';
  relationship: string;
}

export interface AnalysisResult {
  resources: TerraformResource[];
  securityIssues: SecurityIssue[];
  dependencies: ResourceDependency[];
  summary: {
    totalResources: number;
    resourcesByType: Record<string, number>;
    securityScore: number;
    criticalIssues: number;
    regions: string[];
    providers: string[];
  };
}