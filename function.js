window.function = function (facilitatorsData, shiftsData, startDate, endDate, locations, state) {
	// Extract the .value from each parameter and assign default values for undefined inputs
	const facilitators = facilitatorsData.value ?? "[]";
	const shifts = shiftsData.value ?? "[]";
	const start = startDate.value ?? "2027-05-03T00:00:00.000Z";
	const end = endDate.value ?? "2027-05-09T23:59:00.000Z";
	const locationsValue = locations.value ?? "";
	const stateValue = state.value ?? "VIC";
	
	// Return undefined if required inputs are missing //
	if (!facilitators || !shifts) {
		return undefined;
	}
	
	// Helper to get status class name
	function getStatusClass(status) {
		return 'status-' + (status || 'maybe').toLowerCase();
	}

	// Helper function to escape HTML to prevent XSS
	function escapeHtml(text) {
		if (!text) return '';
		const map = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return String(text).replace(/[&<>"']/g, m => map[m]);
	}

	// Helper function to parse basic markdown to HTML
	function parseMarkdown(text) {
		if (!text) return '';
		let html = escapeHtml(text);
		// Bold: **text** or __text__
		html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
		html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
		// Italic: *text* or _text_
		html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
		html = html.replace(/_(.+?)_/g, '<em>$1</em>');
		// Line breaks
		html = html.replace(/\n/g, '<br>');
		return html;
	}

	// Helper function to parse date string to YYYY-MM-DD format
	function parseDateString(dateValue) {
		if (!dateValue) return null;
		if (dateValue.includes('T')) {
			return dateValue.split('T')[0];
		}
		const parsed = new Date(dateValue);
		return isNaN(parsed.getTime()) ? null : parsed.toISOString().split('T')[0];
	}

	// Helper function to format time (12-hour format)
	function formatTime(timeStr) {
		const [hours, minutes] = timeStr.split(':');
		const hour24 = parseInt(hours, 10);
		const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
		const ampm = hour24 >= 12 ? 'PM' : 'AM';
		return `${hour12}:${minutes} ${ampm}`;
	}

	// Helper function to sanitize JSON strings by escaping control characters
	function sanitizeJsonString(str) {
		if (!str) return str;
		// Replace unescaped control characters (except already escaped ones)
		// This handles tabs, newlines, carriage returns, and other control chars
		return str.replace(/[\x00-\x1F\x7F]/g, (char) => {
			switch (char) {
				case '\t': return '\\t';
				case '\n': return '\\n';
				case '\r': return '\\r';
				case '\b': return '\\b';
				case '\f': return '\\f';
				default: return '\\u' + ('0000' + char.charCodeAt(0).toString(16)).slice(-4);
			}
		});
	}

	// Handle JSON strings from Glide
	// Glide sends comma-separated objects without array brackets, so we wrap them
	// Sanitize first to handle any unescaped control characters in the data
	const facilitatorsArray = JSON.parse(`[${sanitizeJsonString(facilitators)}]`);
	const shiftsArray = JSON.parse(`[${sanitizeJsonString(shifts)}]`);
	
	// Check if there are no facilitators (handle empty array, array with empty objects, or array with empty array)
	const validFacilitators = facilitatorsArray.filter(fac => fac && typeof fac === 'object' && Object.keys(fac).length > 0);
	
	if (!facilitatorsArray || facilitatorsArray.length === 0 || validFacilitators.length === 0) {
		return '<div style="padding: 20px; text-align: center; font-size: 16px; color: #666;">There are no facilitators available</div>';
	}
	
	// Parse locations data if provided
	let locationsArray = null;
	if (locationsValue) {
		try {
			// Glide sends comma-separated objects without array brackets, so we wrap them
			// Sanitize first to handle any unescaped control characters
			locationsArray = JSON.parse(`[${sanitizeJsonString(locationsValue)}]`);
		} catch (e) {
			console.error('Failed to parse locations:', e);
		}
	}
	
	// Create a map of locationID to location name
	const locationMap = {};
	if (locationsArray && Array.isArray(locationsArray)) {
		locationsArray.forEach(location => {
			locationMap[location.rowID] = location.name;
		});
	}
	
	// Parse closed dates from shiftsData - items that are both calDate and closedDay
	const closedDates = new Set();
	
	// Get state for filtering closed dates
	const cityState = stateValue || null;
	
	// Helper function to check state match
	function checkStateMatch(shiftState) {
		if (!shiftState) return !cityState;
		const shiftStates = shiftState.split(',').map(s => s.trim());
		return !cityState || shiftStates.includes(cityState);
	}
	
	// Separate calendar dates from regular shifts
	const regularShifts = [];
	
	shiftsArray.forEach(shift => {
		const isCalDate = shift.calDate === 'true' || shift.calDate === true;
		const isClosedDay = shift.closedDay === 'true' || shift.closedDay === true;
		
		if (isCalDate && isClosedDay) {
			// This is a closed date - check if stateValue is included in shift.state
			if (checkStateMatch(shift.state || null)) {
				const dateString = parseDateString(shift.date || shift.startDateTime);
				if (dateString) {
					closedDates.add(dateString);
				}
			}
			// Don't add this to regularShifts - it's a calendar date
		} else if (!isCalDate) {
			// This is a regular facilitator shift
			regularShifts.push(shift);
		}
	});
	
	// Parse date range from startDate and endDate parameters
	let allDates = new Set();
	
	if (start && end) {
		// Parse dates without timezone conversion
		const startDateStr = start.includes('T') ? start.split('T')[0] : start; // Extract YYYY-MM-DD
		const endDateStr = end.includes('T') ? end.split('T')[0] : end; // Extract YYYY-MM-DD
		
		// Create dates in UTC to avoid timezone conversion
		const startDateObj = new Date(startDateStr + 'T00:00:00.000Z');
		const endDateObj = new Date(endDateStr + 'T23:59:59.999Z');
		
		// Generate dates without timezone conversion
		const currentDate = new Date(startDateObj);
		
		while (currentDate <= endDateObj) {
			const dateString = currentDate.toISOString().split('T')[0];
			allDates.add(dateString);
			currentDate.setUTCDate(currentDate.getUTCDate() + 1);
		}
	}
	
	// Group regular shifts by date and facilitator (using filtered regularShifts instead of all shifts)
	const shiftsByDate = {};
	
	regularShifts.forEach(shift => {
		const date = parseDateString(shift.date); // Get YYYY-MM-DD format (cached)
		if (!date) return; // Skip if date parsing failed
		allDates.add(date); // Also add dates from shifts in case they're outside the range
		
		if (!shiftsByDate[date]) {
			shiftsByDate[date] = {};
		}
		
		const facilitatorEmail = shift.facilitator;
		if (!shiftsByDate[date][facilitatorEmail]) {
			shiftsByDate[date][facilitatorEmail] = [];
		}
		
		shiftsByDate[date][facilitatorEmail].push(shift);
	});
	
	// Pre-sort all shifts by start time
	Object.keys(shiftsByDate).forEach(date => {
		Object.keys(shiftsByDate[date]).forEach(facEmail => {
			shiftsByDate[date][facEmail].sort((a, b) => {
				const timeA = new Date(a.startDateTime).getTime();
				const timeB = new Date(b.startDateTime).getTime();
				// Handle invalid dates (NaN values) - put them at the end
				if (isNaN(timeA)) return 1;
				if (isNaN(timeB)) return -1;
				return timeA - timeB;
			});
		});
	});
	
	// Sort dates
	const sortedDates = Array.from(allDates).sort();
	
	// Sort facilitators by rosterOrder (numeric, smallest first, empty/missing at bottom)
	const sortedFacilitators = [...facilitatorsArray].sort((a, b) => {
		const aNum = a.rosterOrder != null && a.rosterOrder !== '' ? Number(a.rosterOrder) : null;
		const bNum = b.rosterOrder != null && b.rosterOrder !== '' ? Number(b.rosterOrder) : null;
		const aValid = aNum !== null && !isNaN(aNum);
		const bValid = bNum !== null && !isNaN(bNum);

		if (!aValid && !bValid) return (a.fullName || '').localeCompare(b.fullName || '');
		if (!aValid) return 1;
		if (!bValid) return -1;
		return aNum - bNum;
	});
	
	// Pre-compute today's date string in local timezone (do this before HTML generation)
	const today = new Date();
	const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
	
	// Generate HTML using array for better performance
	const numDateColumns = sortedDates.length;
	const tableWidth = 200 + (numDateColumns * 200);
	const htmlParts = [`<div>
		<table class="roster-table" style="width: ${tableWidth}px;">
			<colgroup>
				<col style="width: 200px;">
				${'<col style="width: 200px;">'.repeat(numDateColumns)}
			</colgroup>
			<tbody>`];
	
	// Add rows for each facilitator
	sortedFacilitators.forEach((facilitator, index) => {
		const isFirstRow = index === 0;
		const rowClass = isFirstRow ? 'roster-row-first' : 'roster-row-regular';
		
		// Check if all shifts for this facilitator are confirmed
		let allShiftsConfirmed = true;
		let hasShifts = false;
		let totalHours = 0;
		
		sortedDates.forEach(date => {
			const facilitatorShifts = shiftsByDate[date] && shiftsByDate[date][facilitator.email] 
				? shiftsByDate[date][facilitator.email] 
				: [];
			
			facilitatorShifts.forEach(shift => {
				// Only count actual shifts (not unavailable, not all day)
				if (!shift.unavailable && !shift.allDay) {
					hasShifts = true;
					// Only confirmed shifts count for the green tick
					const isConfirmedForFac = shift.confirmed === true || shift.confirmed === 'true';
					if (!isConfirmedForFac) {
						allShiftsConfirmed = false;
					}
					
					// Calculate hours for this shift
					if (shift.startDateTime && shift.endDateTime) {
						const startTime = new Date(shift.startDateTime).getTime();
						const endTime = new Date(shift.endDateTime).getTime();
						const durationHours = (endTime - startTime) / (1000 * 60 * 60); // Convert milliseconds to hours
						totalHours += durationHours;
					}
				}
			});
		});
		
		// Build the name cell content with avatar or confirmation badge
		let avatarHtml;
		if (hasShifts && allShiftsConfirmed) {
			// Show green circle with white tick
			avatarHtml = `<div class="facilitator-badge facilitator-badge-confirmed">✓</div>`;
		} else if (hasShifts && !allShiftsConfirmed) {
			// Show orange circle with question mark
			avatarHtml = `<div class="facilitator-badge facilitator-badge-pending">?</div>`;
		} else if (facilitator.avatar) {
			// Show regular avatar
			avatarHtml = `<img src="${facilitator.avatar}" class="facilitator-avatar" />`;
		} else {
			avatarHtml = '';
		}
		
		// Format hours display (show whole numbers without decimals, otherwise 1 decimal place)
		const hoursFormatted = totalHours % 1 === 0 ? totalHours.toFixed(0) : totalHours.toFixed(1);
		const hoursDisplay = `🕐 ${hoursFormatted} hrs`;
		
		htmlParts.push(`<tr>
				<td class="${rowClass} roster-cell-name">
					<div class="facilitator-info">
						${avatarHtml}
						<div class="facilitator-details">
							<span>${escapeHtml(facilitator.fullName)}</span>
							<span class="facilitator-hours">${hoursDisplay}</span>
						</div>
					</div>
				</td>`);
		
		// Add cells for each date
		sortedDates.forEach(date => {
			const cellClass = isFirstRow ? 'roster-cell-first' : 'roster-cell-regular';
			// Check if this date is a closed date or today and apply appropriate background
			const isClosedDate = closedDates.has(date);
			const isToday = date === todayString;
			let dateClass = '';
			if (isClosedDate) {
				dateClass = ' roster-cell-closed';
			} else if (isToday) {
				dateClass = ' roster-cell-today';
			}
			htmlParts.push(`<td class="${cellClass} roster-cell-content${dateClass}">`);
			
			const facilitatorShifts = shiftsByDate[date] && shiftsByDate[date][facilitator.email] 
				? shiftsByDate[date][facilitator.email] 
				: [];
			
			// Shifts are already pre-sorted, no need to sort again
			
			// Detect overlapping shifts
			const overlappingShiftIndices = new Set();
			if (facilitatorShifts.length > 1) {
				for (let i = 0; i < facilitatorShifts.length; i++) {
					const shiftA = facilitatorShifts[i];
					// Skip unavailable or all-day shifts for overlap detection
					if (shiftA.unavailable === true || shiftA.unavailable === 'true' || 
						shiftA.allDay === true || shiftA.allDay === 'true') continue;
					
					const startA = new Date(shiftA.startDateTime).getTime();
					const endA = new Date(shiftA.endDateTime).getTime();
					
					for (let j = i + 1; j < facilitatorShifts.length; j++) {
						const shiftB = facilitatorShifts[j];
						// Skip unavailable or all-day shifts for overlap detection
						if (shiftB.unavailable === true || shiftB.unavailable === 'true' || 
							shiftB.allDay === true || shiftB.allDay === 'true') continue;
						
						const startB = new Date(shiftB.startDateTime).getTime();
						const endB = new Date(shiftB.endDateTime).getTime();
						
						// Check if shifts overlap (startA < endB AND startB < endA)
						if (startA < endB && startB < endA) {
							overlappingShiftIndices.add(i);
							overlappingShiftIndices.add(j);
						}
					}
				}
			}
			
			if (facilitatorShifts.length > 0) {
				facilitatorShifts.forEach((shift, shiftIndex) => {
					// Extract time from UTC string without timezone conversion (cached)
					const startDateTime = shift.startDateTime;
					const endDateTime = shift.endDateTime;
					const startTime = startDateTime ? new Date(startDateTime).toISOString().substr(11, 5) : '';
					const endTime = endDateTime ? new Date(endDateTime).toISOString().substr(11, 5) : '';
					
					const startTimeFormatted = startTime ? formatTime(startTime) : '';
					const endTimeFormatted = endTime ? formatTime(endTime) : '';
					
				// Pre-compute shift properties once
				const isUnavailable = shift.unavailable === true || shift.unavailable === 'true';
				const isAllDay = shift.allDay === true || shift.allDay === 'true';
				const isConfirmed = shift.confirmed === true || shift.confirmed === 'true';
				const isPublished = !!shift.published;
				const isDropped = shift.dropped === true || shift.dropped === 'true' || (shift.dropped && typeof shift.dropped === 'string' && shift.dropped.trim() !== '' && shift.dropped.trim().toLowerCase() !== 'false'); // Check if shift has a dropped date (handles boolean true, string "true", or any non-empty text that isn't "false")
				// Support both legacy "drop accepted" and new "dropAccepted" keys
				const isDropAcceptedRaw = shift.dropAccepted !== undefined ? shift.dropAccepted : shift['drop accepted'];
				const isDropAccepted = isDropped && (isDropAcceptedRaw === true || isDropAcceptedRaw === 'true');
				const isUnconfirmed = !isConfirmed && !isUnavailable && !isAllDay && !isPublished && !isDropped;
				
				// Get location text for all shifts
				const locationText = shift.locationName || (shift.locationID && locationMap[shift.locationID] ? locationMap[shift.locationID] : '');
				
				// Get notes text for all shifts
				const notesText = shift.notes || '';
				
				// Get display text
				const displayText = (isUnavailable || isAllDay) ? notesText : locationText;
				
				// Determine CSS classes based on shift status
				let shiftClass = 'shift-container';
				let locationClass = 'shift-location';
				const statusClass = getStatusClass(shift.shiftStatus);
				
				if (isDropAccepted) {
					// Dropped and accepted styling
					shiftClass += ' shift-dropped-accepted';
					locationClass += ' location-dropped';
				} else if (isDropped) {
					// Dropped shift styling - purple
					shiftClass += ' shift-dropped';
					locationClass += ' location-dropped';
				} else if (isUnavailable) {
					shiftClass += ' shift-unavailable';
					locationClass += ' location-confirmed status-unavailable';
				} else if (isAllDay) {
					shiftClass += ' shift-allday';
					locationClass += ' location-confirmed status-allday';
				} else if (isConfirmed) {
					shiftClass += ' shift-confirmed ' + statusClass;
					locationClass += ' location-confirmed ' + statusClass;
				} else if (isPublished) {
					shiftClass += ' shift-published ' + statusClass;
					locationClass += ' location-published ' + statusClass;
				} else {
					// Unconfirmed
					shiftClass += ' shift-unconfirmed ' + statusClass;
					locationClass += ' location-unconfirmed ' + statusClass;
				}
					
				// Add hover class for all shifts with notes
				const hoverClass = notesText ? ' shift-with-notes' : '';
				
				// Check if this shift overlaps with another
				const isOverlapping = overlappingShiftIndices.has(shiftIndex);
				const overlapClass = isOverlapping ? ' shift-overlapping' : '';
				// Published but not yet confirmed
				const isPublishedNotConfirmed = isPublished && !isConfirmed;
				const publishedUnconfirmedClass = isPublishedNotConfirmed ? ' shift-published-unconfirmed' : '';
				
				htmlParts.push(`<div class="${shiftClass}${hoverClass}${overlapClass}${publishedUnconfirmedClass}">`);
				
				// Show "DROP REQUESTED" for dropped shifts that haven't been accepted yet
				if (isDropped && !isDropAccepted) {
					htmlParts.push(`<div class="drop-requested-title">DROP REQUESTED</div>`);
				}
				
				// Show "DROP ACCEPTED" for accepted drops
				if (isDropAccepted) {
					htmlParts.push(`<div class="drop-accepted-title">DROPPED</div>`);
				}
				
				// Build the overlap indicator HTML if needed
				const overlapIndicatorHtml = isOverlapping 
					? `<span class="overlap-indicator" title="This shift overlaps with another shift"></span>` 
					: '';
				// Orange arrow for published but not confirmed
				const pendingConfirmationIndicatorHtml = isPublishedNotConfirmed 
					? `<span class="pending-confirmation-indicator" title="Published, awaiting confirmation"></span>` 
					: '';
				
				// Check if this facilitator is the lead facilitator for this shift
				const isLeadFac = shift.leadFac && shift.facilitator && shift.leadFac.trim().toLowerCase() === shift.facilitator.trim().toLowerCase();
				const leadFacIndicator = isLeadFac ? ' ✪' : '';
				
				// Check if shift times differ from master shift times
				let differentTimeIndicator = '';
				if (shift.mastershiftStart && shift.mastershiftEnd && startDateTime && endDateTime) {
					const masterStartMs = new Date(shift.mastershiftStart).getTime();
					const masterEndMs = new Date(shift.mastershiftEnd).getTime();
					const shiftStartMs = new Date(startDateTime).getTime();
					const shiftEndMs = new Date(endDateTime).getTime();
					if (shiftStartMs !== masterStartMs || shiftEndMs !== masterEndMs) {
						differentTimeIndicator = ' ◑';
					}
				}

				// Only show time for non-allDay shifts
				if (!isAllDay) {
					const notesIndicator = notesText ? ' ⓘ' : '';
					htmlParts.push(`<div class="shift-time-row"><span class="shift-time">${escapeHtml(startTimeFormatted)} - ${escapeHtml(endTimeFormatted)}${differentTimeIndicator}${leadFacIndicator}${notesIndicator}</span>${overlapIndicatorHtml}${pendingConfirmationIndicatorHtml}</div>`);
				} else {
					// For allDay shifts, just show "ALL DAY"
					const notesIndicator = notesText ? ' ⓘ' : '';
					htmlParts.push(`<div class="shift-time-row"><span class="shift-time">ALL DAY${leadFacIndicator}${notesIndicator}</span>${overlapIndicatorHtml}${pendingConfirmationIndicatorHtml}</div>`);
				}
				
				// Show content based on shift type
				if (isUnavailable || isAllDay) {
					// For unavailable/allDay shifts, show notes as primary content
					if (displayText) {
						htmlParts.push(`<div class="shift-notes">${escapeHtml(displayText)}</div>`);
					}
				} else {
					// For accepted drops, show drop reason instead of location
					const shiftLocationText = isDropAccepted && shift.dropReason ? shift.dropReason : locationText;
					if (shiftLocationText) {
						// Use parseMarkdown for drop reason (may contain markdown), escapeHtml for regular location
						const locationContent = isDropAccepted && shift.dropReason ? parseMarkdown(shiftLocationText) : escapeHtml(shiftLocationText);
						htmlParts.push(`<div class="${locationClass}" title="${escapeHtml(shiftLocationText)}">${locationContent}</div>`);
					}
					if (notesText) {
						htmlParts.push(`<div class="shift-notes">${escapeHtml(notesText)}</div>`);
					}
				}
				
				htmlParts.push(`</div>`);
				});
			}
			
			htmlParts.push(`</td>`);
		});
		
		htmlParts.push(`</tr>`);
	});
	
	htmlParts.push(`</tbody>
		</table>
	</div>`);
	
	return htmlParts.join('');
}
