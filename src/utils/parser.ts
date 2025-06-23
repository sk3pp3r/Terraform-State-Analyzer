import { TerraformState, TerraformResource, AnalysisResult } from '../types/terraform';

export class TerraformParser {
  static parseStateFile(content: string): TerraformState {
    try {
      const parsed = JSON.parse(content);
      
      // Validate basic structure
      if (!parsed.resources || !Array.isArray(parsed.resources)) {
        throw new Error('Invalid Terraform state file: missing resources array');
      }

      return {
        version: parsed.version || 4,
        terraform_version: parsed.terraform_version || 'unknown',
        serial: parsed.serial || 1,
        lineage: parsed.lineage || 'unknown',
        outputs: parsed.outputs || {},
        resources: parsed.resources
      };
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format in state file');
      }
      throw error;
    }
  }

  static generateAnalysis(state: TerraformState): AnalysisResult {
    const resourcesByType: Record<string, number> = {};
    const regions = new Set<string>();
    const providers = new Set<string>();

    // Process resources
    state.resources.forEach(resource => {
      const key = resource.type;
      resourcesByType[key] = (resourcesByType[key] || 0) + 1;

      // Extract provider
      if (resource.provider) {
        const providerName = resource.provider.split('.')[0].replace('provider["', '').replace('"]', '');
        providers.add(providerName);
      }

      // Extract regions from common attributes
      resource.instances.forEach(instance => {
        const attrs = instance.attributes;
        if (attrs.region) regions.add(attrs.region);
        if (attrs.availability_zone) {
          const region = attrs.availability_zone.slice(0, -1);
          regions.add(region);
        }
      });
    });

    return {
      resources: state.resources,
      securityIssues: [], // Will be populated by security analyzer
      dependencies: [], // Will be populated by dependency analyzer
      summary: {
        totalResources: state.resources.length,
        resourcesByType,
        securityScore: 85, // Placeholder - will be calculated
        criticalIssues: 0, // Will be calculated
        regions: Array.from(regions),
        providers: Array.from(providers)
      }
    };
  }

  static validateFileSize(file: File): boolean {
    const maxSize = 50 * 1024 * 1024; // 50MB
    return file.size <= maxSize;
  }

  static validateFileType(file: File): boolean {
    const validExtensions = ['.tfstate', '.json'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
  }
}