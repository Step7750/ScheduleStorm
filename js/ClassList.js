class ClassList {
	constructor(uni, term) {

		this.baseURL = "http://api.schedulestorm.com:5000/v1/";

		this.uni = uni;
		this.term = term;
		this.location = location;

		this.getClasses();
	}

	getClasses() {
		$("#courseSelector").slideUp(function () {
			$("#courseSelector").empty();
		});

		var self = this;
        $.getJSON(this.baseURL + "unis/" + this.uni + "/" + this.term + "/all", function(data) {
            self.populateClasses(data["classes"], $("#courseSelector"));
            $("#courseSelector").slideDown();
        });
	}

	/*
		Recursively populates the class list
	*/
	populateClasses(data, element) {
		if (data != undefined && data["classes"] == undefined) {
			for (var val in data) {
				console.log(val);
			}
		}
	}
}