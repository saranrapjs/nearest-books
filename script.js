(function(bks) {
	var books = function() {
		var self = this;
		this.queue = []
		if (localStorage.getItem('books')) {
			books_parsed = JSON.parse(localStorage.getItem('books'));
			if (books_parsed && books_parsed.length) {
				this.queue = books_parsed
			}
		}
		window.addEventListener('load', function() {
			self.refresh();
		})
	}
	books.prototype.add = function(item) {
		var found = false;
		this.queue.forEach(function(book) {
			if (book.url === item.url) found = true;
		})
		if (found === false) {
			this.queue.push(item)
		}
		return this
			.store()
			.refresh()
			.compare();
	}
	books.prototype.remove = function(i) {
		this.queue.splice(i, 1)
		return this
			.store()
			.refresh()
			.compare();
	}
	books.prototype.store = function() {
		localStorage.setItem('books', JSON.stringify(this.queue))
		return this;
	}
	books.prototype.refresh = function() {
		var $queue = $("#queue").empty(),
			self = this;
		this.queue.forEach(function(book, i) {
			var $li = $("<li><a target='_blank' href='"+book.url+"'>"+book.title.replace(' | Brooklyn Public Library | BiblioCommons','')+"</a></li>")
				.data('book', i)
				.appendTo($queue)
			$(' <span class="glyphicon glyphicon-minus book-remove"></span>')
				.appendTo($li)
				.click(function() {
					var $parent = $(this).parent();
					self.remove($parent.data('book'))
					$parent.remove()
				})
		});
		return this;
	}
	books.prototype.compare = function() {
		if (!this.queue.length) {
			$("#result").html("None at the moment")
			return;
		}
		var deferreds = [],
			self = this;
		for (var i = 0; i < this.queue.length; i++) {
			deferreds.push( fetchLocationsFromBook(this.queue[i]) )
		};
		 $.when
		 	.apply($, deferreds)
		 	.then(function( a1, a2 ) {
		 		var comparables = [],
		 			open,
		 			closed;
				for (var i = arguments.length - 1; i >= 0; i--) {
					if (arguments[i] !== false) { // if there is at least one branch with availability
						self.queue[i].title = arguments[i].title
						comparables.push(arguments[i])
					}
				};
				self.store().refresh();
				/* first sort by distance */
				comparables.sort(function(a,b) {
					return a.branch.distance > b.branch.distance
				})
				for (var i = comparables.length - 1; i >= 0; i--) {
					comparables[i].big_summary = "A copy of " +
						"<a href='"+comparables[i].url+"' target='_blank'>"+comparables[i].title+"</a>" +
						" is @ " + comparables[i].branch.name + 
						", with call number <span class='call'>" + comparables[i].call+"</span>. " +
						"The " + comparables[i].branch.name + " is open until " + comparables[i].closing
					comparables[i].short_summary = "" + 
						"<a href='"+comparables[i].url+"' target='_blank'>"+comparables[i].title+"</a> @ "+
						comparables[i].branch.name; 
					comparables[i].short_summary += " & " + (comparables[i].total - 1) + " other" + {true:'s',false:''}[((comparables[i].total-1)>1 || (comparables[i].total-1) < 1)];
					if (comparables[i].branch.is_open === false) {
						comparables[i].short_summary += " <span class='hours'>(opens at "+comparables[i].branch.next_opens+")</span>" 
					}
					comparables[i].short_summary += " <span class='away'>"+(comparables[i].branch.distance.toFixed(2))+
						" miles away</span>";
					comparables[i].short_summary +=" <span class='call'>"+comparables[i].call+"</span>";
				};


				open = comparables.filter(function(result) {
					return result.branch.is_open === true
				})

				// console.log(open[0], open[1])

				closed = comparables.filter(function(result) {
					return result.branch.is_open === false
				})

				$("#result").empty();
				$("#results_nearby").empty()
				$("#results_soon").empty()

				if (open.length) {
					var nearest_book = open.shift(),
						lat_lng = nearest_book.branch.lat+","+nearest_book.branch.lon,
						map_src = "http://maps.googleapis.com/maps/api/staticmap?center="+lat_lng+"&zoom=16&size=600x300&maptype=roadmap&markers=color:red%7Clabel:1%7C"+lat_lng;

					$("#result").html(nearest_book.big_summary)
					$("#map").append("<img src='"+map_src+"'/>")
					for (var i = 0; i < open.length ; i++) {
						$("#results_nearby")
							.append("<li>"+open[i].short_summary+"</li>")
					};					
				} else {
					$("#result").html("None at the moment")
				}
				if (closed.length) {
					for (var i = 0; i < closed.length ; i++) {
						$("#results_soon")
							.append("<li>"+closed[i].short_summary+"</li>")
					};
				}
			})
		return this;
	}	
	window.bks = new books();
})(window.bks)

var my_lat = 0,
	my_lng = 0;

// from http://stackoverflow.com/questions/27928/how-do-i-calculate-distance-between-two-latitude-longitude-points
function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d *  0.62137; // in miles?
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function keyword2biblio(keyword, cb) {
	$.getJSON("https://www.googleapis.com/customsearch/v1?key=AIzaSyDnRu2m9vVOU_r36m1qzM0v06k7ttuRV0g&cx=012378086504733536278:7vddv_uqxny&q="+keyword+"&callback=?", function(result) {
		var link, url;
		if (result.items.length) {
			url = result.items[0].link;
			title = result.items[0].title;
		}
		if (url && cb) cb({
			url : url,
			title : title
		})
	})
}

function findBranch(name) {
	var location = {},
		shortName = new RegExp(name.split(" ")[0]);
	locations.forEach(function(branch) {
		if (shortName.test(branch.name)) {
			location = branch;
			location.lat = parseFloat(location.lat)
			location.lon = parseFloat(location.lon)
			location.distance = getDistanceFromLatLonInKm(my_lat, my_lng, location.lat, location.lon)
		}
	})
	return location;
}
function is_branch_open(branch) {

	Number.prototype.toDayString = function() {
		return {
			0 : 'Sunday',
			1 : 'Monday',
			2 : 'Tuesday',
			3 : 'Wednesday',
			4 : 'Thursday',
			5 : 'Friday',
			6 : 'Saturday'
		}[this.valueOf()]
	}

	Number.prototype.toTimeString = function() {
		var value = (this.valueOf() % 1200),
			is_pm = (this.valueOf() >= 1300),
			with_dots = Math.floor(value/100).toString() + ":" + ((value % 100) + '00').slice(0,2);
		return with_dots + ' ' + {true : 'PM', false : 'AM'}[is_pm]
	}

	branch.is_open = false;
	branch.closes_at = false;
	branch.next_opens = '';

	if (branch.hours) {
		var now = new Date(),
			twenty_four_now = (now.getHours() * 100) + now.getMinutes(),
			today = now.getDay(),
			branch_today = branch.hours[ today ],
			tomorrow = ((today + 1) % 7 ) || 0,
			branch_tomorrow = branch.hours[ tomorrow ];

		if (twenty_four_now >= branch_today[0] && twenty_four_now <= branch_today[1]) {
			branch.is_open = true;
			branch.closes_at = branch_today[1];
			// console.log(branch_tomorrow)
			// branch.next_opens = tomorrow.toDayString() + " at " + branch_tomorrow[0].toTimeString();
		} else {
			// var today = 1;
			for (var i = 0; i < 7; i++) {
				var tomorrow = (today + i ) % 7,
					branch_tomorrow = branch.hours[tomorrow];				
				if (branch_tomorrow !== false && (tomorrow !== today || branch_tomorrow[0] > twenty_four_now)) {
					branch.next_opens = tomorrow.toDayString() + " at " + branch_tomorrow[0].toTimeString();
					break;
					// if (tomorrow !== today) {
					// 	break;
					// } else {

					// }
				}
			};

		}

	}
	return branch;
}
function biblio2circulation(biblio_id, cb) {

	$.getJSON('http://brooklyn.bibliocommons.com/item/show_circulation/'+biblio_id+'.json?callback=?', function(data) {
			var $div = $(data.html),
				available = [],
				title = $div.find("#aria_bib_title").text().replace('--','').trim();

			$trs = $div.find('tbody tr').each(function() {
				var branch = $(this).find('[testid="item_branch_name"]').text().trim(),
					status = $(this).find('[testid="item_status"]').text().trim(),
					call = $(this).find('[testid="item_call_number"]').text().trim(),
					branch_info;
				if (/CHECK SHELVES/.test(status)) {
					branch_info = findBranch(branch)
					branch_info = is_branch_open(branch_info)
					available.push({
						branch: branch_info,
						call : call,
						title : title
					})
				}
			})
			if (cb) cb(available)

	})

}

function fetchLocationsFromBook(book) {
	var defer = $.Deferred();
	String.prototype.url2biblio = function() {
		var match = this.toString().match(/item\/show\/([0-9]+)/);
		return (match && match.length) ? match[1] : null;
	}
	var biblio_id = book.url.url2biblio();
	if (biblio_id) {
		biblio2circulation(biblio_id, function(branches) {
			var nearest;
			if (branches.length) {
				nearest = nearestBranch(branches)						
				nearest.url = book.url;
				nearest.total = branches.length
			} else {
				nearest = false
			}
			defer.resolve(nearest);
		})				
	}
	return defer;
}


function nearestBranch(branches) {
	var closest = branches.reduce(function(previousBranch, thisBranch) {
		return (previousBranch.branch.distance < thisBranch.branch.distance)
			? previousBranch
			: thisBranch;
	})
	closest.closing = ((closest.branch.hours[new Date().getDay()][1] / 100) - 12) + "pm.";
	return closest;
}

window.onload = function() { 

   function showResults(data) {
	   	if (!data.items || !data.items.length) {
	   		if (data.queries && data.queries.request) { // cheap
	   			console.log(data)
	   			var query = data.queries.request[0].searchTerms,
	   				psuedo_title = query.split("/"),
	   				psuedo_title = psuedo_title[psuedo_title.length - 1];

	   			if (/https?\:\/\/brooklyn\.bibliocommons\.com\/item\/show\//.test(query)) {
	   				return [
	   					{
	   						title : psuedo_title,
	   						url : query
	   					}
	   				]
	   			}
	   		}
	   		return [];
	   	}
	    return $.map(data.items, function (item) {
	        return {
	            title: item.title.replace(' | Brooklyn Public Library | BiblioCommons',''),
	            url: item.link
	        };
	    });
	};

	var results = new Bloodhound({
		datumTokenizer: function(data) {
		  return Bloodhound.tokenizers.whitespace(data.title)
		},
		queryTokenizer: Bloodhound.tokenizers.obj.whitespace,
		remote: {
			url : "https://www.googleapis.com/customsearch/v1?key=AIzaSyDnRu2m9vVOU_r36m1qzM0v06k7ttuRV0g&cx=012378086504733536278:7vddv_uqxny&q=%QUERY&callback=?",
			ajax: {
				type:'GET',
				dataType:'jsonp'
			},
			filter: showResults
		}
	});

	results.initialize()

	$('#add_to_queue')
		.typeahead(null, {
		    name: 'results',
		    displayKey: 'title',
		    source: results.ttAdapter()
		})
		.on('typeahead:selected', function(e, book) {
			// console.log("ADDING", book)
			bks.add(book)
			$('#add_to_queue').typeahead('val', '').blur();
		})


	navigator.geolocation.getCurrentPosition(function(pos) {

	  var crd = pos.coords;

	  console.log('Your current position is:');
	  console.log('Latitude : ' + crd.latitude);
	  console.log('Longitude: ' + crd.longitude);
	  console.log('More or less ' + crd.accuracy + ' meters.');

	  my_lat = crd.latitude
	  my_lng = crd.longitude

	  bks.compare();

	});

}