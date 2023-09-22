import * as fs from 'fs';

interface Node {
  id: number;
  connections: number[];
}

interface Graph {
  nodes: Node[];
}

function generateRandomGraph(numNodes: number, maxEdgesPerNode: number): Graph {
  const nodes: Node[] = [];

  // Create nodes
  for (let nodeId = 0; nodeId < numNodes; nodeId++) {
    const edges: number[] = [];
    const numEdges = Math.max(Math.floor(Math.random() * maxEdgesPerNode), 1);

    // Connect each node to a random set of other nodes
    for (let i = 0; i < numEdges; i++) {
      let randomNodeId;
      do {
        randomNodeId = Math.floor(Math.random() * numNodes);
      } while (randomNodeId === nodeId || edges.includes(randomNodeId));

      edges.push(randomNodeId);
    }

    nodes.push({ id: nodeId, connections: edges });
  }

  return { nodes };
}

const numNodes = 400; // Change as needed
const maxEdgesPerNode = 8; // Change as needed

const graph = generateRandomGraph(numNodes, maxEdgesPerNode);
const jsonGraph = JSON.stringify(graph, null, 2);

fs.writeFileSync('../src/server/data/random_graph.json', jsonGraph);
console.log('Random graph data saved to random_graph.json');
