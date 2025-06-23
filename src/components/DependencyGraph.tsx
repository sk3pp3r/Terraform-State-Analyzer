import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AnalysisResult } from '../types/terraform';
import { DependencyAnalyzer } from '../utils/dependencies';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Filter,
  Search,
  Download,
  Maximize2,
  Settings,
  Info
} from 'lucide-react';

interface DependencyGraphProps {
  analysis: AnalysisResult;
  onBack: () => void;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  name: string;
  provider: string;
  group: number;
  level: number;
  dependencies: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  type: 'explicit' | 'implicit';
  relationship: string;
  strength: number;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  analysis,
  onBack
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutType, setLayoutType] = useState<'force' | 'hierarchical' | 'circular'>('force');
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [linkStrength, setLinkStrength] = useState(0.5);

  const networkData = DependencyAnalyzer.getResourceNetwork(
    analysis.dependencies,
    analysis.resources
  );

  // Enhanced node processing with dependency counts and levels
  const nodeGroups = new Map<string, number>();
  let groupIndex = 0;
  
  const nodes: Node[] = networkData.nodes.map(node => {
    if (!nodeGroups.has(node.type)) {
      nodeGroups.set(node.type, groupIndex++);
    }
    
    const dependencyCount = analysis.dependencies.filter(
      dep => dep.source === node.id || dep.target === node.id
    ).length;
    
    return {
      ...node,
      group: nodeGroups.get(node.type) || 0,
      level: 0, // Will be calculated based on dependency depth
      dependencies: dependencyCount
    };
  });

  const links: Link[] = networkData.links.map(link => ({
    ...link,
    source: link.source,
    target: link.target,
    strength: link.type === 'explicit' ? 1 : 0.5
  }));

  // Filter nodes and links
  const filteredNodes = nodes.filter(node => {
    const matchesType = filterType === 'all' || node.type === filterType;
    const matchesSearch = searchQuery === '' || 
      node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.type.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const filteredLinks = links.filter(link => {
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    return filteredNodes.some(n => n.id === sourceId) && filteredNodes.some(n => n.id === targetId);
  });

  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 1000;
    const height = 700;
    const centerX = width / 2;
    const centerY = height / 2;

    // Enhanced color scale
    const color = d3.scaleOrdinal()
      .domain([...nodeGroups.keys()])
      .range([
        '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
        '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
      ]);

    // Create zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    const container = svg.append('g');

    // Create simulation based on layout type
    let simulation: d3.Simulation<Node, Link>;

    if (layoutType === 'hierarchical') {
      // Calculate levels for hierarchical layout
      const levels = new Map<string, number>();
      const visited = new Set<string>();
      
      const calculateLevel = (nodeId: string, level: number = 0): void => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        levels.set(nodeId, Math.max(levels.get(nodeId) || 0, level));
        
        filteredLinks.forEach(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          if (sourceId === nodeId) {
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;
            calculateLevel(targetId, level + 1);
          }
        });
      };

      filteredNodes.forEach(node => calculateLevel(node.id));
      filteredNodes.forEach(node => {
        node.level = levels.get(node.id) || 0;
      });

      simulation = d3.forceSimulation<Node>(filteredNodes)
        .force('link', d3.forceLink<Node, Link>(filteredLinks).id(d => d.id).distance(100))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('y', d3.forceY().y(d => d.level * 120 + 100).strength(0.8))
        .force('x', d3.forceX(centerX).strength(0.1))
        .force('collision', d3.forceCollide().radius(30));
    } else if (layoutType === 'circular') {
      const radius = Math.min(width, height) / 3;
      filteredNodes.forEach((node, i) => {
        const angle = (i / filteredNodes.length) * 2 * Math.PI;
        node.fx = centerX + radius * Math.cos(angle);
        node.fy = centerY + radius * Math.sin(angle);
      });

      simulation = d3.forceSimulation<Node>(filteredNodes)
        .force('link', d3.forceLink<Node, Link>(filteredLinks).id(d => d.id).distance(80))
        .force('charge', d3.forceManyBody().strength(-100));
    } else {
      // Force-directed layout
      simulation = d3.forceSimulation<Node>(filteredNodes)
        .force('link', d3.forceLink<Node, Link>(filteredLinks).id(d => d.id).distance(100).strength(linkStrength))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(centerX, centerY))
        .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.dependencies) * 5 + 20));
    }

    // Create gradient definitions for links
    const defs = svg.append('defs');
    
    // Arrow markers
    defs.selectAll('marker')
      .data(['explicit', 'implicit'])
      .enter().append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => d === 'explicit' ? '#374151' : '#9CA3AF');

    // Create links
    const link = container.append('g')
      .selectAll('line')
      .data(filteredLinks)
      .enter().append('line')
      .attr('stroke', d => d.type === 'explicit' ? '#374151' : '#9CA3AF')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => d.type === 'explicit' ? 2 : 1)
      .attr('stroke-dasharray', d => d.type === 'implicit' ? '5,5' : 'none')
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Create nodes
    const node = container.append('g')
      .selectAll('g')
      .data(filteredNodes)
      .enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGGElement, Node>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          if (layoutType === 'force') {
            d.fx = null;
            d.fy = null;
          }
        }));

    // Add circles to nodes with size based on dependencies
    node.append('circle')
      .attr('r', d => Math.sqrt(d.dependencies) * 3 + 12)
      .attr('fill', d => color(d.type) as string)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('click', (event, d) => {
        setSelectedNode(d);
      })
      .on('mouseover', function(event, d) {
        d3.select(this).attr('stroke-width', 4);
        
        // Highlight connected links
        link.attr('stroke-opacity', l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return sourceId === d.id || targetId === d.id ? 1 : 0.2;
        });

        // Show tooltip
        const tooltip = d3.select('body').append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('z-index', '1000')
          .html(`
            <strong>${d.name}</strong><br/>
            Type: ${d.type}<br/>
            Dependencies: ${d.dependencies}
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-width', 2);
        link.attr('stroke-opacity', 0.6);
        d3.selectAll('.tooltip').remove();
      });

    // Add labels to nodes
    if (showLabels) {
      node.append('text')
        .text(d => d.name.length > 12 ? d.name.substring(0, 12) + '...' : d.name)
        .attr('dy', d => Math.sqrt(d.dependencies) * 3 + 25)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('fill', '#374151')
        .style('pointer-events', 'none');
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Store handlers for cleanup
    (svg.node() as any).zoomControls = {
      handleZoomIn: () => svg.transition().call(zoomBehavior.scaleBy, 1.5),
      handleZoomOut: () => svg.transition().call(zoomBehavior.scaleBy, 1 / 1.5),
      handleReset: () => svg.transition().call(zoomBehavior.transform, d3.zoomIdentity)
    };

    return () => {
      simulation.stop();
    };
  }, [filteredNodes, filteredLinks, layoutType, showLabels, linkStrength]);

  const uniqueTypes = [...new Set(nodes.map(node => node.type))].sort();

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current);
    const controls = (svg.node() as any)?.zoomControls;
    if (controls) controls.handleZoomIn();
  };

  const handleZoomOut = () => {
    const svg = d3.select(svgRef.current);
    const controls = (svg.node() as any)?.zoomControls;
    if (controls) controls.handleZoomOut();
  };

  const handleReset = () => {
    const svg = d3.select(svgRef.current);
    const controls = (svg.node() as any)?.zoomControls;
    if (controls) controls.handleReset();
  };

  const exportGraph = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dependency-graph.svg';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={onBack}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium mb-4 flex items-center space-x-2"
          >
            <span>← Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dependency Graph</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Interactive visualization of resource dependencies and relationships
          </p>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search and Filter */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Search & Filter</h3>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            </div>

            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
              >
                <option value="all">All Resource Types</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>
                    {type.replace('aws_', '').replace('_', ' ')}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
            </div>
          </div>

          {/* Layout Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Layout & Display</h3>
            
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Layout Type</label>
              <select
                value={layoutType}
                onChange={(e) => setLayoutType(e.target.value as any)}
                className="w-full appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white text-sm"
              >
                <option value="force">Force-Directed</option>
                <option value="hierarchical">Hierarchical</option>
                <option value="circular">Circular</option>
              </select>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="showLabels"
                checked={showLabels}
                onChange={(e) => setShowLabels(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="showLabels" className="text-sm text-gray-700 dark:text-gray-300">
                Show Labels
              </label>
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Link Strength: {linkStrength.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={linkStrength}
                onChange={(e) => setLinkStrength(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* View Controls */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">View Controls</h3>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Zoom: {Math.round(zoom * 100)}%
              </span>
              <div className="flex space-x-1">
                <button
                  onClick={handleZoomIn}
                  className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={handleZoomOut}
                  className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
                <button
                  onClick={handleReset}
                  className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  title="Reset View"
                >
                  <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredNodes.length} of {nodes.length} resources
            </div>

            <button
              onClick={exportGraph}
              className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Export SVG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Graph Container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors duration-300">
        <div className="flex">
          {/* Graph */}
          <div className="flex-1">
            {filteredNodes.length === 0 ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Network className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Resources Found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting the filter to see dependency relationships
                  </p>
                </div>
              </div>
            ) : (
              <svg
                ref={svgRef}
                width="100%"
                height="700"
                viewBox="0 0 1000 700"
                className="border-r border-gray-100 dark:border-gray-700"
              />
            )}
          </div>

          {/* Details Panel */}
          <div className="w-80 p-6 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Resource Details
            </h3>
            
            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                  <p className="text-gray-900 dark:text-white font-mono text-sm break-all">{selectedNode.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                  <p className="text-gray-900 dark:text-white">{selectedNode.type}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Provider</label>
                  <p className="text-gray-900 dark:text-white">{selectedNode.provider || 'N/A'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dependencies</label>
                  <p className="text-gray-900 dark:text-white text-2xl font-bold">{selectedNode.dependencies}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full ID</label>
                  <p className="text-gray-900 dark:text-white font-mono text-xs break-all">{selectedNode.id}</p>
                </div>

                {/* Related Dependencies */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Related Dependencies
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {analysis.dependencies
                      .filter(dep => dep.source === selectedNode.id || dep.target === selectedNode.id)
                      .map((dep, index) => (
                        <div key={index} className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {dep.source === selectedNode.id ? '→ ' : '← '}
                            {(dep.source === selectedNode.id ? dep.target : dep.source).split('.').pop()}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {dep.type} • {dep.relationship}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Network className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Click on a resource node to view its details and dependencies
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{filteredNodes.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Resources</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{filteredLinks.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Dependencies</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{uniqueTypes.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Resource Types</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 transition-colors duration-300">
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {filteredLinks.filter(l => l.type === 'explicit').length}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Explicit Deps</p>
          </div>
        </div>
      </div>
    </div>
  );
};