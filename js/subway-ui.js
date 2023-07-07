/// <reference path="../typings/globals/jquery/index.d.ts" />

if (typeof jQuery == "undefined") {
    throw new Error("jQuery unavailable; Subway UI will not work.");
}

var SubwayUI = {

    lastConnections: [],
    lastNodeCollection: {},
    svgZoomer: 0,

    maxNodes: 32,

    Initialization: function () {

        // Add functionality to existing nodes

        $("section.nodes li:not(:last-child)").each(function (index, node) {
            SubwayUI.AddFunctionalityToNode(node);
        });

        // Add input checking to the start node

        SubwayUI.AddInputCheckingTo($("section.nodes ul.startnode li"));

        // Add functionality to "add new node" buttons

        SubwayUI.AddFunctionalityToAdders();

        // Add functionality to "Generate" and "Redraw" buttons

        $(".submit.go").click(function (event) {
            event.preventDefault();
            SubwayUI.Draw(true);
        });

        $(".submit.redraw").click(function (event) {
            event.preventDefault();
            SubwayUI.Redraw();
        });

        // Generate some initial extra nodes
        SubwayUI.CreateSomeNodes(3, 6);
        SubwayUI.Draw(true);

        // Initialize location system
        SubwayUI.Locations.Initialize();

    },

    Dialog: {

        currentPayload: {},

        CloseDialog: function () {
            $(".fader").css("display", "none");
        },

        OpenDialog: function (payload) {
            SubwayUI.Dialog.ResetDialog();

            SubwayUI.Dialog.currentPayload = payload;
            SubwayUI.Dialog.currentPayload.Initialize();

            $(".dialog header h2").text(SubwayUI.Dialog.currentPayload.Title);

            $(".dialog header .close").click(SubwayUI.Dialog.currentPayload.Cancel);
            $(".dialog footer .submit").click(SubwayUI.Dialog.currentPayload.Submit);

            $(".fader").css("display", "flex");
        },

        ResetDialog: function () {

            // Depopulate the list -- remove all but one
            var locationGenreElements = $(".dialog ul.choicelist li");

            if (locationGenreElements.length > 1) {
                for (var i = 1; i < locationGenreElements.length; i++) {
                    locationGenreElements[i].remove();
                }
            }

            // Reset the text of the remaining element
            $(".dialog ul.choicelist li a").text("Empty");

            // Empty the text box
            $(".dialog .textbox").empty();

        }

    },

    Locations: {

        locationGenres: [],
        locationNames: {},

        Initialize: function () {
            $("a.submit.locations").click(function (e) {
                e.preventDefault();
                SubwayUI.Dialog.OpenDialog(SubwayUI.Locations.DialogPayload);
            });
        },

        DialogPayload: {
            Title: "Randomize location names",

            Initialize: function () {
                SubwayUI.Locations.LoadLocationData();

                $("section.dialog footer a.submit").click(function (e) {
                    e.preventDefault();
                    SubwayUI.Locations.ApplyGenreLocationNamesToNodes();
                    SubwayUI.Dialog.CloseDialog();
                });
            },

            Cancel: function () {
                SubwayUI.Dialog.CloseDialog();
            },

            Submit: function () {
                SubwayUI.Locations.ApplyGenreLocationNamesToNodes();
                SubwayUI.Redraw();
                SubwayUI.Dialog.CloseDialog();
            }
        },

        LoadLocationData: function () {
            $.ajax(
                "./data/locations.xml"
            ).done(function (data, textStatus) {

                if (textStatus == "success") {

                    // Empty data
                    SubwayUI.Locations.locationGenres = [];
                    SubwayUI.Locations.locationNames = {};

                    // Save genre names and locations in locationGenres and locationNames respectively

                    $(data).children("genres").children("genre").each(function (index, genreElement) {
                        var genreName = genreElement.getAttribute("title");

                        if (genreName) {
                            SubwayUI.Locations.locationGenres.push(genreName);
                            SubwayUI.Locations.locationNames[genreName] = [];

                            $(genreElement).children("location").each(function (index, locationElement) {
                                SubwayUI.Locations.locationNames[genreName].push(locationElement.textContent);
                            });
                        }
                    });

                    // Generate genre links

                    // 1) Find template element
                    var genreLinkTemplate = $(".dialog ul.choicelist li");

                    var currentGenreElement = genreLinkTemplate;

                    for (var i = 0; i < SubwayUI.Locations.locationGenres.length; i++) {

                        // Create clone of last element
                        if (i > 0) {
                            var newGenreElement = currentGenreElement.clone();
                            newGenreElement.insertAfter(currentGenreElement);
                            currentGenreElement = newGenreElement;
                        }

                        // Set element's text
                        currentGenreElement.find(".name").text(SubwayUI.Locations.locationGenres[i]);

                        // Add functionality to element
                        currentGenreElement.find("a").click(function (event) {
                            event.preventDefault();
                            SubwayUI.Locations.LoadGenreLocations($(this).text());
                        });
                    }

                }
            });
        },

        LoadGenreLocations: function (genre) {
            if (SubwayUI.Locations.locationNames[genre]) {

                // Find the textbox
                var textBox = $(".dialog .textbox");

                // Clear the textbox
                textBox.text("");

                // Add all locations of current genre
                SubwayUI.Locations.locationNames[genre].forEach(location => {

                    $("<div></div>")
                        .text(location)
                        .appendTo(textBox);

                });
            }
        },

        ApplyGenreLocationNamesToNodes: function () {

            // Find text box contents
            var localLocationNames = $(".dialog .textbox").contents();

            // Create local list of location strings
            var locationStrings = [];

            // Populate the list based on box contents, excluding empties
            localLocationNames.each(function (i, element) {
                if (element.textContent.trim().length > 0) {
                    locationStrings.push(element.textContent.trim());
                }
            });

            if (locationStrings.length > 0) {

                var indexArray = [];

                $(".nodeList li .label").each(function (i, label) {

                    // If the array of indices is empty, regenerate it
                    if (indexArray.length == 0) {
                        for (var j = 0; j < locationStrings.length; j++) {
                            indexArray.push(j);
                        }
                    }

                    // Randomize one index from the location index array
                    var indexIndex = Math.floor(Math.random() * indexArray.length);

                    // Use that randomized index to get a valid location index from the location index array
                    var locationIndex = indexArray[indexIndex];

                    // Use that location
                    label.textContent = locationStrings[locationIndex];

                    // Remove that index from the location index array
                    indexArray.splice(indexIndex, 1);

                });
            }
        }
    },

    AddFunctionalityToAdders: function () {
        $("section.nodes:not(.startnode) li:last-child a").click(function (event) {
            event.preventDefault();

            var parentList = $(this).closest("ul");

            SubwayUI.AddNewNodeTo(parentList);
            SubwayUI.CheckIfRedrawable();

            // If # nodes reached max, hide the adder
            if (($(this).parentsUntil("ul").siblings().length >= SubwayUI.maxNodes)) {
                $(this).parentsUntil("ul").hide();
            }
        });
    },

    AddNewNodeTo: function (parentList) {
        // Use the first element as template
        var nodeElement = $(parentList).children("li:not(:last-child)").first();

        // Create clone and empty its span
        var clone = this.CloneElement(nodeElement);
        clone.children("span.label").empty();

        // Fill its span with the next available letter
        clone.children("span.label").text(this.GetNextUnusedAlphabeticalName());

        // Insert the new element as the second-before-last in the list.
        clone.insertBefore($(parentList).children("li:last-child"));

        this.CheckForErrors(clone.children("span.label"));

    },

    AddFunctionalityToNode: function (node) {

        // make remove-button work
        $(node).find("a.remove").click(function (event) {
            event.preventDefault();

            if ($(this).parentsUntil("ul").siblings().length-1 < SubwayUI.maxNodes) {
                $(this).parentsUntil("ul").siblings().last().show();
            }

            var nodeElement = $(this).closest("li");

            nodeElement.remove();
            SubwayUI.CheckForErrors();
            SubwayUI.CheckIfRedrawable();

            

        });

        // make copy button work
        $(node).find("a.copy").click(function (event) {
            event.preventDefault();
            var nodeElement = $(this).closest("li");

            var clone = SubwayUI.CloneElement(nodeElement);
            clone.insertAfter(nodeElement);
            SubwayUI.CheckForErrors();
            SubwayUI.CheckIfRedrawable();
        });

        this.AddInputCheckingTo(node);

    },

    AddInputCheckingTo: function (node) {
        // Add some input checking, in case the user is an idiot
        $(node).find("span.label").on("input", function () {
            SubwayUI.CheckForErrors();
        });
    },

    CheckForErrors: function () {

        var showSubmitButton = true;

        $("ul.nodeList span.label").each(function (index, element) {
            var text = $(element).text().trim();

            // Is the label empty?
            if (text == "") {
                $(element).siblings("span.warning").show().children("span.tooltip").text("Node text may not be empty");
                showSubmitButton = false;
                // Is the label not unique?
            } else if ($("span.label").filter(function () {
                    return this.textContent === text;
                }).length > 1) {
                $(element).siblings("span.warning").show().children("span.tooltip").text("Node text must be unique");
                showSubmitButton = false;
            } else {
                $(element).siblings("span.warning").hide();
            }
        });

        if (showSubmitButton) {
            $("a.submit.go").show();
            return true;
        } else {
            $("a.submit.go").hide();
            return false;
        }

    },

    CheckIfRedrawable: function () {
        var nCollection = this.GetNodesFromUI();

        // Redraw button only visible when node lengths are the same
        if (this.lastNodeCollection.nodes.length == nCollection.nodes.length &&
            this.lastNodeCollection.endNodes.length == nCollection.endNodes.length
        ) {
            $(".submit.redraw").show();
        } else {
            $(".submit.redraw").hide();
        }


    },

    CloneElement: function (nodeElement) {
        var clone = nodeElement.clone();
        // Clean out the old text span, ensuring no false positives


        var labelElement = clone.find("span.label");
        var oldLabel = labelElement.text();
        labelElement.text("");
        var label = this.GetNextUnusedNumberedLabel(oldLabel);
        labelElement.text(label);

        this.AddFunctionalityToNode(clone);
        return clone;
    },

    GetNextUnusedAlphabeticalName: function () {

        var alphabet = "abcdefghijklmnopqrstuvwxyz".toUpperCase().split("");

        var unused = "";

        var nodeElementsSpanList = $(".nodeList span.label");

        for (var i = 0; unused === "" && i < alphabet.length; i++) {
            unused = alphabet[i];
            nodeElementsSpanList.each(function (index, element) {
                // Check if used
                if (element.textContent === alphabet[i]) {
                    unused = "";
                }
            });
        }

        return unused;
    },

    GetNextUnusedNumberedLabel: function (label) {

        var labelArray = label.split("");

        // Reverse the label; much easier to work with if the end is at the beginning
        labelArray.reverse();

        // Go through the array, find out if there is a number at the end and, if so, 
        // which is the last consecutive number character after it.
        var proceed = true;
        var indexOfFirstNumber = -1;
        for (var i = 0; i < labelArray.length && proceed == true; i++) {
            if (!isNaN(labelArray[i]) && labelArray[i] != " ") {
                indexOfFirstNumber = i;
            } else {
                proceed = false;
            }
        }

        // If there were at least one number at the end
        if (indexOfFirstNumber >= 0) {

            // Slice the label into parts based on where the first number appears
            var numberPart = labelArray.slice().splice(0, indexOfFirstNumber + 1).reverse().join("");
            var textPart = labelArray.slice().splice(indexOfFirstNumber + 1).reverse().join("");

            // Find all label spans
            var nodeElementsSpanList = $(".nodeList span.label");

            var unused = "";

            // Start comparing at the number that is one higher than the cloned node's
            numberPart++;

            // Go through available numbers (from current to 1024). Stop if unused number is found.
            for (var j = numberPart; unused === "" && j < (numberPart + 1024); j++) {

                // Set candidate
                unused = j;

                // Go through all nodes to see if they are using the candidate
                nodeElementsSpanList.each(function (index, element) {

                    // If one node is using it; reset candidate
                    if (element.textContent === textPart + j) {
                        unused = "";
                        return false;
                    }
                });
            }

            return textPart + (j - 1);

        } else {
            return label;
        }
    },

    CreateSomeNodes: function (min, max) {

        var parentList = $("ul.nodes.nodeList");
        var numberOfRandomNodes = Math.floor(Math.random() * (max - min)) + min;

        for (var i = 0; i < numberOfRandomNodes; i++) {
            this.AddNewNodeTo(parentList);
        }
    },

    GetNodesFromUI: function () {

        var nCollection = new Subway.NodeCollection();

        nCollection.startNode = $("ul.startnode.nodeList span.label").text();

        $("ul.endnodes.nodeList span.label").each(function (index, element) {
            nCollection.endNodes.push(element.textContent);
        });

        $("ul.nodes.nodeList span.label").each(function (index, element) {
            nCollection.nodes.push(element.textContent);
        });

        return nCollection;

    },

    Draw: function (generate = true) {

        if (this.CheckForErrors()) {

            var nodeCollection = this.GetNodesFromUI();

            var connections;

            if (generate) {
                connections = Subway.GenerateConnections(nodeCollection);
            } else {
                connections = Subway.ReplaceNodeNames(SubwayUI.lastNodeCollection, nodeCollection, SubwayUI.lastConnections);
            }

            var result = Subway.GenerateVizResult(nodeCollection, connections, "svg");

            $("#paper").empty().append(result);

            SubwayUI.svgZoomer = svgPanZoom("#paper svg", {
                contain: true,
                zoomScaleSensitivity: 0.75,
                controlIconsEnabled: true
            });

            // Save information for later use
            SubwayUI.lastConnections = connections;
            SubwayUI.lastNodeCollection = nodeCollection;

            SubwayUI.CheckForErrors();
            SubwayUI.CheckIfRedrawable();

        }
    },

    Redraw: function () {
        var zoom = SubwayUI.svgZoomer.getZoom();
        var pan = SubwayUI.svgZoomer.getPan();
        SubwayUI.Draw(false);

        SubwayUI.svgZoomer.zoom(zoom);
        SubwayUI.svgZoomer.pan(pan);
    }
};