class Loading {
	// Creates the loading animation at the specified element

	constructor(element, loadingtext, styling) {
		this.element = element;

		// We need at least 150px for the animation
		element.css("min-height", "150px");

		// TODO: We should use the user's most recent selections to generate the loading subjects
		this.html = $(this.createCubeHTML(["CPSC", "ART", "CHEM", "GEOG", "MATH", "STAT"], loadingtext, styling))
					.hide()
					.appendTo(element)
					.fadeIn();
	}

	/*
		Constructs the cube html given the subjects
	*/
	createCubeHTML(subjects, text, styling) {
		this.faces = ["front", "back", "left", "right", "bottom", "top"];

		if (styling == undefined) var html = "<center id='loading'>" + text +"<div class='Cube panelLoad'>";
		else var html = "<center id='loading' style='" + styling + "'>" + text +"<div class='Cube panelLoad'>";

		for (var key in subjects) {
			html += "<div class='cube-face cube-face-" + 
							this.faces[key] + "'>" + subjects[key] + "</div>";
		}
		html += "</div></center>";

		return html
	}

	/*
		Fade out and remove the loading animation
	*/
	remove(cb) {
		self = this;

		// Fade out the animation
		this.html.fadeOut(function () {
			// Change the min height on the parent, remove the loader html and initiate the callback
			self.element.animate({"min-height": ""}, 500, function () {
				self.html.remove();
				cb();
			});
		});
	}
}