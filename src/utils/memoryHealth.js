function memoryHealth(graph) {
    const nodes = graph?.nodes || {};
    const edges = graph?.edges || [];
    const danglingEdges = edges.filter(edge => edge.to && !nodes[edge.to]);
    const supersededNodes = Object.values(nodes).filter(node => node.validUntil !== null && node.validUntil !== undefined);
    const orphanedEdges = edges.filter(edge => edge.from && !nodes[edge.from]);
    return {
        status: danglingEdges.length || orphanedEdges.length ? 'warn' : 'pass',
        nodeCount: Object.keys(nodes).length,
        edgeCount: edges.length,
        danglingEdges,
        orphanedEdges,
        supersededNodes: supersededNodes.map(node => node.id),
        builtAt: graph?.builtAt || null
    };
}
module.exports = { memoryHealth };
