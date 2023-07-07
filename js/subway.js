if (typeof Viz == "undefined") {
    throw new Error("Viz.js unavailable; Subway node map generation will not work.");
}

// eslint-disable-next-line no-unused-vars
var Subway = {

    /* ----------------------------------------------------------------------------
    | DOT LANGUAGE NODE STYLES
    -----------------------------------------------------------------------------*/

    defaultNodeStyle: "[shape=\"box\" style=filled fillcolor=\"#ffffff\" fontname=\"Arial\" fontsize=9 height=0.3]",
    startNodeStyle: "[style=filled,penwidth=2,fillcolor=\"#55ee55\"]",
    endNodeStyle: "[penwidth=2]",

    /* ----------------------------------------------------------------------------
    | CLASS DEFINITIONS
    -----------------------------------------------------------------------------*/

    Connection: class {
        get from() {
            return this._from;
        }

        set from(value) {
            this._from = value;
        }

        get to() {
            return this._to;
        }

        set to(value) {
            this._to = value;
        }
    },

    NodeCollection: class {
        constructor() {
            this.startNode = "Start";
            this.endNodes = [];
            this.nodes = [];
        }
        get startNode() {
            return this._startNode;
        }

        set startNode(value) {
            this._startNode = value;
        }

        get endNodes() {
            return this._endNodes;
        }

        set endNodes(value) {
            this._endNodes = value;
        }

        get nodes() {
            return this._nodes;
        }

        set nodes(value) {
            this._nodes = value;
        }
    },

    /* ----------------------------------------------------------------------------
    | METHODS
    -----------------------------------------------------------------------------*/

    /* ARRAY METHODS --------------------------------------------------------------
    -----------------------------------------------------------------------------*/

    ArrayExcept: function(arr, exceptions) {
        return arr.filter(function(node) {

            return exceptions.indexOf(node) < 0;

        });
    },

    ArrayRandomExcept: function (arr, exceptions) {

        // make copy of array
        var arrCopy = this.ArrayExcept(arr, exceptions);

        // If there are still things in the array, randomize an index and return the corresponding object
        if (arrCopy.length > 0) {
            return arrCopy[Math.floor(Math.random() * arrCopy.length)];
        } else {
            // Otherwise, return -1
            return -1;
        }

    },

    ArrayWhittle: function (arr, length) {

        //var length = Math.floor(arr.length * fraction);

        var arrCopy = arr.slice();

        while (arrCopy.length > length) {
            var indexToRemove = Math.floor(Math.random() * arrCopy.length);

            arrCopy.splice(indexToRemove, 1);
        }

        return arrCopy;
    },

    /* CONNECTION METHODS ---------------------------------------------------------
    -----------------------------------------------------------------------------*/

    GetConnectedNodes: function (connections, node, connectionType) {
        // connectionType should be "to" or "from"!

        var connectionAntiType = "to";
        if (connectionType == "to") {
            connectionAntiType = "from";
        }

        var filteredConnections = connections.filter(connection => connection[connectionType] == node);

        var nodes = [];

        for (var i = 0; i < filteredConnections.length; i++) {
            nodes.push(filteredConnections[i][connectionAntiType]);
        }

        return nodes;
    },

    AddRandomConnections: function (allNodes, nodes, connections, connectionType = "from", allowLoops = true) {

        // connectionType not implemented!!!

        var connectionAntiType = "to";
        if (connectionType == "to") {
            connectionAntiType = "from";
        }

        var newConnection, i;

        var baseNode, connectedNode;

        var connectionsCopy = connections.slice();

        var nodesCopy = nodes.slice();

        for (i = 0; i < nodesCopy.length; i++) {

            //from = nodesCopy[i];
            baseNode = nodesCopy[i]; // "to" or "from" node depending on connectionType

            // Disallow connections with the baseNode itself
            var disallowedFroms = [baseNode];

            if (!allowLoops) {
                // Disallow all nodes currently connected in any way to the baseNode
                disallowedFroms = disallowedFroms.concat(
                    this.GetConnectedNodes(connectionsCopy, nodesCopy[i], "from"),
                    this.GetConnectedNodes(connectionsCopy, nodesCopy[i], "to")
                );
            }

            connectedNode = this.ArrayRandomExcept(allNodes, disallowedFroms);

            if (connectedNode != -1) {
                //newConnection = new Connection(from, to);
                newConnection = new this.Connection();
                newConnection[connectionType] = baseNode;
                newConnection[connectionAntiType] = connectedNode;

                connectionsCopy.push(newConnection);
            }
        }

        return connectionsCopy;
    },

    ReplaceNodeNames(oldNodes, newNodes, oldConnections) {
        var replacementDictionary = {};
        var i;
        var newConnections = [];

        replacementDictionary[oldNodes.startNode] = newNodes.startNode;

        ["nodes", "endNodes"].forEach(function(subCollection) {

            for (i = 0; i < Math.min(oldNodes[subCollection].length, newNodes[subCollection].length); i++) {
                replacementDictionary[oldNodes[subCollection][i]] = newNodes[subCollection][i];
            }

        });


        if (oldConnections.length > 0) {

            for(i = 0; i < oldConnections.length; i++) {
                
                var oldC = oldConnections[i];

                var newC = new Subway.Connection();
                newC.from = replacementDictionary[oldC.from];
                newC.to = replacementDictionary[oldC.to];

                newConnections.push(newC);
            }

        }

        return newConnections;
    },

    GetNodesWithLessThan: function (nodes, connections, connectionType, number) {

        var nodesResult = [];

        for (var i = 0; i < nodes.length; i++) {

            var connectedNodes = this.GetConnectedNodes(connections, nodes[i], connectionType);
            if (connectedNodes.length < number) {
                nodesResult.push(nodes[i]);
            }
        }

        return nodesResult;
    },

    /* VIZ METHODS ----------------------------------------------------------------
    -----------------------------------------------------------------------------*/

    GenerateDotLanguage: function (nCollection, connections) {
        var dotText = "strict digraph {";

        // Graph style
        dotText += "bgcolor=\"transparent\";";
        dotText += "graph[pad=1, nodesep=0.8];";

        // Node default style
        dotText += "node " + Subway.defaultNodeStyle + ";";

        for (var i = 0; i < connections.length; i++) {
            dotText += "\"" + connections[i].from + "\"" + "->" + "\"" + connections[i].to + "\";";
        }

        // Styling the start node
        dotText += "\"" + nCollection.startNode + "\" " + Subway.startNodeStyle + ";";

        // Styling the end nodes
        nCollection.endNodes.forEach(function(endNode) {
            dotText += "\"" + endNode + "\" " + Subway.endNodeStyle + ";";
        });

        dotText += "}";

        return dotText;
    },

    GenerateVizResult: function(nCollection, connections, vizFormat = "png-image-element", vizEngine = "dot") {

        var dotText = this.GenerateDotLanguage(nCollection, connections);

        // Create and display Viz.js result
        var result = Viz(dotText, {
            format: vizFormat,
            engine: vizEngine
        });

        return result;

    },

    /* ----------------------------------------------------------------------------
    | CONNECTION GENERATION CODE
    -----------------------------------------------------------------------------*/

    GenerateConnections: function (nCollection) {

        var STEP1_ALLOW_LOOPS = false;
        var STEP2_ALLOW_LOOPS = false;
        var STEP2_FRACTION = 0.6;
        var STEP4_MINIMUM_FROMS = 2;
        var STEP4_MAXIMUM_INVALID = 0.4;

        // Create empty array
        var connections = [];

        // STEP ONE - initial connections generated
        connections = this.AddRandomConnections(
            nCollection.nodes,
            nCollection.nodes,
            connections,
            "from",
            STEP1_ALLOW_LOOPS,
            1
        );

        // STEP TWO - Add some additional connections
        connections = this.AddRandomConnections(
            nCollection.nodes,
            this.ArrayWhittle(nCollection.nodes, nCollection.nodes.length * STEP2_FRACTION),
            connections,
            "from",
            STEP2_ALLOW_LOOPS
        );

        // STEP THREE - Make sure each node has at least one 'to' connection
        connections = this.AddRandomConnections(
            nCollection.nodes,
            this.GetNodesWithLessThan(nCollection.nodes, connections, "to", 1),
            connections,
            "to",
            false
        );

        // STEP FOUR - Make sure at least 60% of nodes have at least 2 'from' connections
        var nodesWithTooFewFroms = this.GetNodesWithLessThan(nCollection.nodes, connections, "from", STEP4_MINIMUM_FROMS);

        if (nodesWithTooFewFroms.length / nCollection.nodes.length > STEP4_MAXIMUM_INVALID) {
            connections = this.AddRandomConnections(
                nCollection.nodes,
                this.ArrayWhittle(nodesWithTooFewFroms, nodesWithTooFewFroms.length - Math.floor(nCollection.nodes.length * STEP4_MAXIMUM_INVALID)),
                connections,
                "from",
                false
            );
        }

        // STEP FIVE - Add one start node
        // At least two connections. Maximum is either 6 or (2 + 1/3 of total number of nodes), whichever is lowest
        var startConnections = 2 + Math.floor(Math.random() * Math.min(4, nCollection.nodes.length / 3));

        connections = this.AddRandomConnections(
            nCollection.nodes,
            new Array(startConnections).fill(nCollection.startNode),
            connections,
            "from",
            false
        );

        // STEP SIX - Add end nodes
        var nodesCloseToStart = Subway.GetConnectedNodes(connections, nCollection.startNode,"from");
        var nodesNotAdjacentToStart = Subway.ArrayExcept(nCollection.nodes, nodesCloseToStart);
        var possibleNodeConnections;

        if (nodesNotAdjacentToStart.length > 0) {
            possibleNodeConnections = nodesNotAdjacentToStart;
        } else {
            possibleNodeConnections = nCollection.nodes;
        }

        for (var i = 0; i < nCollection.endNodes.length; i++) {

            // At least two connections. Maximum is either 4 or (2 + 1/4 of total number of nodes), whichever is lowest
            var endConnections = Math.min(2 + Math.floor(Math.random() * Math.min(2, nCollection.nodes.length / 4)), possibleNodeConnections.length);

            connections = this.AddRandomConnections(
                possibleNodeConnections,
                new Array(endConnections).fill(nCollection.endNodes[i]),
                connections,
                "to",
                false
            );
        }

        return connections;
    }
};