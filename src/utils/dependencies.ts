import { TerraformResource, ResourceDependency } from '../types/terraform';

export class DependencyAnalyzer {
  static analyzeDependencies(resources: TerraformResource[]): ResourceDependency[] {
    const dependencies: ResourceDependency[] = [];
    
    // Create resource lookup map
    const resourceMap = new Map<string, TerraformResource>();
    resources.forEach(resource => {
      const key = `${resource.type}.${resource.name}`;
      resourceMap.set(key, resource);
    });

    // Analyze explicit dependencies
    resources.forEach(resource => {
      const sourceId = `${resource.type}.${resource.name}`;
      
      resource.instances.forEach(instance => {
        if (instance.depends_on) {
          instance.depends_on.forEach(dep => {
            dependencies.push({
              source: sourceId,
              target: dep,
              type: 'explicit',
              relationship: 'depends_on'
            });
          });
        }
      });
    });

    // Analyze implicit dependencies through resource references
    resources.forEach(resource => {
      const sourceId = `${resource.type}.${resource.name}`;
      
      resource.instances.forEach(instance => {
        this.findImplicitDependencies(sourceId, instance.attributes, resourceMap)
          .forEach(dep => dependencies.push(dep));
      });
    });

    return dependencies;
  }

  private static findImplicitDependencies(
    sourceId: string, 
    attributes: any, 
    resourceMap: Map<string, TerraformResource>
  ): ResourceDependency[] {
    const dependencies: ResourceDependency[] = [];
    
    // Look for resource references in attributes
    this.searchForReferences(attributes, '', (path, value) => {
      if (typeof value === 'string') {
        // Pattern for Terraform resource references: ${resource_type.resource_name.attribute}
        const refPattern = /\$\{([^.]+\.[^.}]+)(?:\.[^}]+)?\}/g;
        let match;
        
        while ((match = refPattern.exec(value)) !== null) {
          const referencedResource = match[1];
          if (resourceMap.has(referencedResource) && referencedResource !== sourceId) {
            dependencies.push({
              source: sourceId,
              target: referencedResource,
              type: 'implicit',
              relationship: path || 'attribute_reference'
            });
          }
        }
      }
    });

    return dependencies;
  }

  private static searchForReferences(
    obj: any, 
    path: string, 
    callback: (path: string, value: any) => void
  ): void {
    if (typeof obj !== 'object' || obj === null) {
      callback(path, obj);
      return;
    }

    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        this.searchForReferences(item, `${path}[${index}]`, callback);
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = path ? `${path}.${key}` : key;
        this.searchForReferences(value, newPath, callback);
      });
    }
  }

  static getResourceNetwork(dependencies: ResourceDependency[], resources: TerraformResource[]) {
    const nodes = resources.map(resource => ({
      id: `${resource.type}.${resource.name}`,
      type: resource.type,
      name: resource.name,
      provider: resource.provider
    }));

    const links = dependencies.map(dep => ({
      source: dep.source,
      target: dep.target,
      type: dep.type,
      relationship: dep.relationship
    }));

    return { nodes, links };
  }
}