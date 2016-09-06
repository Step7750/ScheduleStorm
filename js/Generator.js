class Generator {
	constructor(classes) {
		// chosen classes
		this.classes = classes;

		this.findCombinations();

		console.log(this.classes);
		console.log(this.combinations);

		
		this.iterateCombos();
		
	}

	/*
		Pushes every combination given the type of groups
	*/
	findCombinations() {
		this.combinations = [];

		for (var group in this.classes) {
			var thisgroup = this.classes[group];
			var type = thisgroup["type"];

			// figure out the length of the courses
			var coursekeys = Object.keys(thisgroup["courses"]);

			if (coursekeys.length > 0) {
				// there must be courses selected
				if (type == 0 || type > coursekeys.length) {
					// they selected all of or they wanted more courses than chosen
					type = coursekeys.length;
				}

				// convert the courses to an array
				var thesecourses = [];
				for (var course in thisgroup["courses"]) {
					thisgroup["courses"][course]["name"] = course;
					thesecourses.push(thisgroup["courses"][course]);
				}

				// push the combinations
				this.combinations.push(Generator.k_combinations(thesecourses, type));
			}
		}
	}

	iterateCombos() {
		if (this.combinations.length > 0) {
			// there must be more than 0 combos for a schedule
			for (var combos in this.combinations[0]) {
				// these are the first combos
				var thisschedule = [];

				// lets get the possible schedules

				if (this.combinations.length > 1) {
					// we have to add the other groups
				}
			}
		}
	}

	generateSchedules(schedule, queue)

	static k_combinations(set, k) {
		/**
		 * Copyright 2012 Akseli Palén.
		 * Created 2012-07-15.
		 * Licensed under the MIT license.
		 * 
		 * <license>
		 * Permission is hereby granted, free of charge, to any person obtaining
		 * a copy of this software and associated documentation files
		 * (the "Software"), to deal in the Software without restriction,
		 * including without limitation the rights to use, copy, modify, merge,
		 * publish, distribute, sublicense, and/or sell copies of the Software,
		 * and to permit persons to whom the Software is furnished to do so,
		 * subject to the following conditions:
		 * 
		 * The above copyright notice and this permission notice shall be
		 * included in all copies or substantial portions of the Software.
		 * 
		 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
		 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
		 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
		 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
		 * BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
		 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
		 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
		 * SOFTWARE.
		 * </lisence>
		 * 
		 * Implements functions to calculate combinations of elements in JS Arrays.
		 * 
		 * Functions:
		 *   k_combinations(set, k) -- Return all k-sized combinations in a set
		 *   combinations(set) -- Return all combinations of the set
		 */

		var i, j, combs, head, tailcombs;
		
		// There is no way to take e.g. sets of 5 elements from
		// a set of 4.
		if (k > set.length || k <= 0) {
			return [];
		}
		
		// K-sized set has only one K-sized subset.
		if (k == set.length) {
			return [set];
		}
		
		// There is N 1-sized subsets in a N-sized set.
		if (k == 1) {
			combs = [];
			for (i = 0; i < set.length; i++) {
				combs.push([set[i]]);
			}
			return combs;
		}
		
		// Assert {1 < k < set.length}
		
		// Algorithm description:
		// To get k-combinations of a set, we want to join each element
		// with all (k-1)-combinations of the other elements. The set of
		// these k-sized sets would be the desired result. However, as we
		// represent sets with lists, we need to take duplicates into
		// account. To avoid producing duplicates and also unnecessary
		// computing, we use the following approach: each element i
		// divides the list into three: the preceding elements, the
		// current element i, and the subsequent elements. For the first
		// element, the list of preceding elements is empty. For element i,
		// we compute the (k-1)-computations of the subsequent elements,
		// join each with the element i, and store the joined to the set of
		// computed k-combinations. We do not need to take the preceding
		// elements into account, because they have already been the i:th
		// element so they are already computed and stored. When the length
		// of the subsequent list drops below (k-1), we cannot find any
		// (k-1)-combs, hence the upper limit for the iteration:
		combs = [];
		for (i = 0; i < set.length - k + 1; i++) {
			// head is a list that includes only our current element.
			head = set.slice(i, i + 1);
			// We take smaller combinations from the subsequent elements
			tailcombs = Generator.k_combinations(set.slice(i + 1), k - 1);
			// For each (k-1)-combination we join it with the current
			// and store it to the set of k-combinations.
			for (j = 0; j < tailcombs.length; j++) {
				combs.push(head.concat(tailcombs[j]));
			}
		}
		return combs;
	}
}