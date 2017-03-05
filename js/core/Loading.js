"use strict";

class Loading {
	// Creates the loading animation at the specified element

	constructor(element, loadingText, styling) {
		this.element = element;

		// We need at least 150px for the animation
		element.css("min-height", "150px");

		// TODO: We should use the user's most recent selections to generate the loading subjects
		this.html = $(this.createCubeHTML(["CPSC", "ART", "CHEM", "GEOG", "MATH", "STAT"], loadingText, styling))
					.hide()
					.appendTo(element)
					.fadeIn();
	}

	/*
		Constructs the cube html given the subjects
	*/
	createCubeHTML(subjects, text, styling) {
		let faces = ["front", "back", "left", "right", "bottom", "top"];
		if (!styling) styling = "";

        let html = `
            <center id='loading' style='${styling}'>
                <div style='display: inline;' id='status'>${text}</div>
                <div class='Cube panelLoad'>
        `;

		for (let key in subjects) {
			html += `<div class='cube-face cube-face-${faces[key]}'>${subjects[key]}</div>`;
		}

		html += "</div></center>";

		return html;
	}

	/*
		Fade out and remove the loading animation
	*/
	remove(cb) {
		// Fade out the animation
		this.html.fadeOut(() => {
			// Change the min height on the parent, remove the loader html and initiate the callback
			this.element.animate({"min-height": ""}, 500, () => {
                this.html.remove();
				cb();
			});
		});
	}

	/*
		Sets the status text to the given message
	*/
	setStatus(message) {
		this.html.find("#status:first").text(message);
	}
}