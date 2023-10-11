"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
function generateRandomGraph(numNodes, maxEdgesPerNode) {
    var nodes = [];
    // Create nodes
    for (var nodeId = 0; nodeId < numNodes; nodeId++) {
        var edges = [];
        var numEdges = Math.max(Math.floor(Math.random() * maxEdgesPerNode), 1);
        // Connect each node to a random set of other nodes
        for (var i = 0; i < numEdges; i++) {
            var randomNodeId = void 0;
            do {
                randomNodeId = Math.floor(Math.random() * numNodes);
            } while (randomNodeId === nodeId || edges.includes(randomNodeId));
            edges.push(randomNodeId);
        }
        nodes.push({ id: nodeId, connections: edges });
    }
    return { nodes: nodes };
}
var numNodes = 200; // Change as needed
var maxEdgesPerNode = 6; // Change as needed
var graph = generateRandomGraph(numNodes, maxEdgesPerNode);
var jsonGraph = JSON.stringify(graph, null, 2);
fs.writeFileSync('../packages/app/src/server/data/random_graph.json', jsonGraph);
console.log('Random graph data saved to random_graph.json');
