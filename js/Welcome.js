class Welcome {

    constructor() {
        this.baseURL = "http://api.schedulestorm.com:5000/v1/";

        // We want to get the list of Unis
        this.getUnis();
    }

    /*
        Obtains the University list from the API server 
    */
    getUnis() {
        // empty the parent
        $("#uniModalList").find("#dataList").empty();

        var thisobj = this;

        $("#welcomeModal").modal({
            backdrop: 'static',
            keyboard: false
        });

        // Add the loading animation
        var loading = new Loading($("#uniModalList").find("#dataList"), "Loading University Data...");

        $.getJSON(this.baseURL + "unis", function(data) {
            // remove the loading animation
            loading.remove(function () {
                // Populate the dropdown in the top right
                thisobj.populateUniDropdown(data);

                window.unis = data;
                thisobj.unis = data;

                // Check to see if they have already selected a Uni and Term in localstorage
                if (localStorage.getItem("uni") != undefined && localStorage.getItem("term") != undefined) {
                    // Hide the modal
                    $("#welcomeModal").modal('hide');

                    // Set this uni
                    thisobj.uni = localStorage.getItem("uni");

                    // Populate the top right dropdown
                    $("#MyUniversity").hide().html(thisobj.unis[thisobj.uni]["name"] + " <span class='caret'></span>").fadeIn('slow');

                    // Load up the classes
                    window.classList = new ClassList(localStorage.getItem("uni"), localStorage.getItem("term"));
                }
                else {
                    $("#uniModalList").find("#dataList").hide();

                    // New user with nothing selected, show them welcome prompts
                    thisobj.populateUnis(data);
                }
            });
        });
    }

    /*
        Populates the top right university dropdown (when the modal isn't showing) and handles the click events
    */
    populateUniDropdown(data) {
        var self = this;

        // Get the dropdown element
        var dropdown  = $("#MyUniversity").parent().find('.dropdown-menu');

        for (var uni in data) {
            // Add this Uni to the dropdown

            var uniobj = data[uni];
            var html = $('<li class="dropdown-items"><a uni="' + uni +'">' + uniobj["name"] +'</a></li>');

            // Bind an onclick event to it
            html.click(function () {

                // Get the selected uni code (UCalgary, etc...)
                self.uni = $(this).find("a").attr("uni");

                // Change the text of the element
                $("#MyUniversity").hide().html(self.unis[self.uni]["name"] + " <span class='caret'></span>").fadeIn('slow');

                // Make sure the modal is active
                $("#welcomeModal").modal({
                    backdrop: 'static',
                    keyboard: false
                });

                // Let the user choose what term they want
                self.displayTerms(self.uni);
            })

            // Append it
            dropdown.append(html);
        }
    }

    /*
        Populates the modal with the Unis
    */
    populateUnis(unis) {
        var thisobj = this;

        var list = $("#uniModalList").find("#dataList");
        var wantedText = $("#uniModalList").find("#wantedData");

        wantedText.text("Please choose your University:");

        // Iterate through the unis and add the buttons
        for (var uni in unis) {
            var button = $(this.createButton(unis[uni]["name"], uni));
            button.click(function() {

                thisobj.uni = $(this).attr("value");
                $("#MyUniversity").hide().html($(this).text() + " <span class='caret'></span>").fadeIn('slow');

                $("#uniModalList").slideUp(function () {
                    thisobj.displayTerms(thisobj.uni);
                });
            });

            list.append(button);
        }

        list.slideDown();
    }

    /*
        Displays the terms to the user
    */
    displayTerms(uni) {
        var thisobj = this; // Keep the reference

        var list = $("#uniModalList").find("#dataList");
        list.empty();
        var wantedText = $("#uniModalList").find("#wantedData");

        wantedText.text("Please choose your term:");

        for (var term in this.unis[uni]["terms"]) {
            var button = $(this.createButton(this.unis[uni]["terms"][term], term));

            button.click(function() {

                thisobj.term = $(this).attr("value");

                window.classList = new ClassList(thisobj.uni, thisobj.term);

                $("#welcomeModal").modal('hide');
            });
            list.append(button);
        }

        $("#uniModalList").slideDown();
    }

    /*
        Returns the text for an HTML button given text, value
    */
    createButton(text, value) {
        return '<button type="button" class="btn btn-default" value="' + value +'">' + text + '</button>'
    }
}
