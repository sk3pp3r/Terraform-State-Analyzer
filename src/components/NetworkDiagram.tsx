import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { AnalysisResult } from '../types/terraform';
import { DependencyAnalyzer } from '../utils/dependencies';
import { Network, ZoomIn, ZoomOut, RotateCcw, Filter } from 'lucide-react';

interface NetworkDiagramProps {
  analysis: AnalysisResult;
  onBack: () => void;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  type: string;
  name: string;
  provider: string;
  group: number;
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
  type: 'explicit' | 'implicit';
  relationship: string;
}

export const NetworkDiagram: React.FC<NetworkDiagramProps> = ({
  analysis,
  onBack
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [zoom, setZoom] = useState(1);

  const networkData = DependencyAnalyzer.getResourceNetwork(
    analysis.dependencies,
    analysis.resources
  );

  // Group nodes by resource type for better visualization
  const nodeGroups = new Map<string, number>();
  let groupIndex = 0;
  
  const nodes: Node[] = networkData.nodes.map(node => {
    if (!nodeGroups.has(node.type)) {
      nodeGroups.set(node.type, groupIndex++);
    }
    return {
      ...node,
      group: nodeGroups.get(node.type) || 0
    };
  });

  const links: Link[] = networkData.links.map(link => ({
    ...link,
    source: link.source,
    target: link.target
  }));

  // Filter nodes and links based on selected type
  const filteredNodes = filterType === 'all' ? nodes : nodes.filter(node => node.type === filterType);
  const filteredLinks = links.filter(link => {
    if (filterType === 'all') return true;
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;
    return filteredNodes.some(n => n.id === sourceId) && filteredNodes.some(n => n.id === targetId);
  });

  useEffect(() => {
    if (!svgRef.current || filteredNodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    // Color scale for different resource types
    const color = d3.scaleOrdinal()
      .domain([...nodeGroups.keys()])
      .range(d3.schemeCategory10);

    // Create zoom behavior
    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform);
        setZoom(event.transform.k);
      });

    svg.call(zoomBehavior);

    const container = svg.append('g');

    // Create simulation
    const simulation = d3.forceSimulation<Node>(filteredNodes)
      .force('link', d3.forceLink<Node, Link>(filteredLinks).id(d => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(centerX, centerY))
      .force('collision', d3.forceCollide().radius(25));

    // Create arrow markers for directed links
    svg.append('defs').selectAll('marker')
      .data(['explicit', 'implicit'])
      .enter().append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
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
          d.fx = null;
          d.fy = null;
        }));

    // Add circles to nodes
    node.append('circle')
      .attr('r', 12)
      .attr('fill', d => color(d.type) as string)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('click', (event, d) => {
        setSelectedNode(d);
      })
      .on('mouseover', function(event, d) {
        d3.select(this).attr('r', 15);
        
        // Highlight connected links
        link.attr('stroke-opacity', l => {
          const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
          const targetId = typeof l.target === 'object' ? l.target.id : l.target;
          return sourceId === d.id || targetId === d.id ? 1 : 0.2;
        });
      })
      .on('mouseout', function() {
        d3.select(this).attr('r', 12);
        link.attr('stroke-opacity', 0.6);
      });

    // Add labels to nodes
    node.append('text')
      .text(d => d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name)
      .attr('dy', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#374151');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as Node).x!)
        .attr('y1', d => (d.source as Node).y!)
        .attr('x2', d => (d.target as Node).x!)
        .attr('y2', d => (d.target as Node).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // Zoom controls handlers
    const handleZoomIn = () => {
      svg.transition().call(zoomBehavior.scaleBy, 1.5);
    };

    const handleZoomOut = () => {
      svg.transition().call(zoomBehavior.scaleBy, 1 / 1.5);
    };

    const handleReset = () => {
      svg.transition().call(zoomBehavior.transform, d3.zoomIdentity);
    };

    // Store handlers for cleanup
    (svg.node() as any).zoomControls = { handleZoomIn, handleZoomOut, handleReset };

    return () => {
      simulation.stop();
    };
  }, [filteredNodes, filteredLinks]);

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Network Topology</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Interactive visualization of resource dependencies and relationships
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Filter */}
          <div className="flex items-center space-x-4">
            <div className="relative">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              >
                <option value="all">All Resources</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>
                    {type.replace('aws_', '').replace('_', ' ')}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredNodes.length} of {nodes.length} resources
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Zoom: {Math.round(zoom * 100)}%</span>
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
      </div>

      {/* Diagram Container */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden transition-colors duration-300">
        <div className="flex">
          {/* Network Diagram */}
          <div className="flex-1">
            {filteredNodes.length === 0 ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Network className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Resources Found</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Try adjusting the filter to see network topology
                  </p>
                </div>
              </div>
            ) : (
              <svg
                ref={svgRef}
                width="100%"
                height="600"
                viewBox="0 0 800 600"
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
                  <p className="text-gray-900 dark:text-white font-mono text-sm">{selectedNode.name}</p>
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Full ID</label>
                  <p className="text-gray-900 dark:text-white font-mono text-xs break-all">{selectedNode.id}</p>
                </div>

                {/* Dependencies */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Dependencies</label>
                  <div className="space-y-2">
                    {analysis.dependencies
                      .filter(dep => dep.source === selectedNode.id || dep.target === selectedNode.id)
                      .map((dep, index) => (
                        <div key={index} className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {dep.source === selectedNode.id ? '→ ' : '← '}
                            {dep.source === selectedNode.id ? dep.target : dep.source}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {dep.type} ({dep.relationship})
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Network className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">
                  Click on a resource node to view its details and dependencies
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Legend</h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Resource Types</h4>
            <div className="space-y-2">
              {uniqueTypes.slice(0, 6).map((type, index) => (
                <div key={type} className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-800"
                    style={{ backgroundColor: d3.schemeCategory10[index % 10] }}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {type.replace('aws_', '').replace('_', ' ')}
                  </span>
                </div>
              ))}
              {uniqueTypes.length > 6 && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  ...and {uniqueTypes.length - 6} more
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Connection Types</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-3">
                <svg width="20" height="2">
                  <line x1="0" y1="1" x2="20" y2="1" stroke="#374151" strokeWidth="2" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">Explicit Dependency</span>
              </div>
              <div className="flex items-center space-x-3">
                <svg width="20" height="2">
                  <line x1="0" y1="1" x2="20" y2="1" stroke="#9CA3AF" strokeWidth="1" strokeDasharray="3,3" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">Implicit Dependency</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};