//----------------------------------------//
// Spielplatzfilter und Spielgerätefinder //
//----------------------------------------//

import { dataPlaygrounds, dataIssues, dataFilteredEquipment } from './map.js';
import { showNotification } from './map.js';
import { getSliderMonth, getValidMonth, getSliderHour } from './shadow.js';

var cqlFilterObject = {
    playgrounds: {},
    completeness: {},
    filteredEquipment: {}
};

// Allgemeine Filterfunktionen für CQL-Filter (Spielplatzblasen und Spielgerätefinder)
export function addFilter(layer, filterClass, filterExpression) {
    cqlFilterObject[layer][filterClass] = filterExpression;
    return updateFilter(layer);
}

export function setFilter(layer, filterClass, filterExpression) {
    cqlFilterObject[layer] = { filterClass: filterExpression };
    return updateFilter(layer);
}

export function removeFilter(layer, filterClass) {
    delete cqlFilterObject[layer][filterClass];
    return updateFilter(layer);
}

export function getFilter(layer) {
    var cqlExpression = "";
    for (var filter in cqlFilterObject[layer]) {
        if (cqlExpression.length > 0) {
            cqlExpression += " AND "
        }
        cqlExpression += `(${cqlFilterObject[layer][filter]})`;
    }
    return cqlExpression;
}

function updateFilter(layer) {
    var cqlExpression = getFilter(layer);
    var lyr = dataPlaygrounds;
    if (layer == "filteredEquipment") {
        lyr = dataFilteredEquipment;
    }
    if (layer == "completeness") {
        lyr = dataIssues;
    }
    // updateParams ist nur bei WMS-Quellen verfügbar (nicht bei VectorSource)
    if (lyr.getSource().updateParams) {
        return lyr.getSource().updateParams({'CQL_FILTER': cqlExpression});
    }
}

function onFilterChange(id, layer, filterClass, filterExpression) {
    const elem = document.getElementById(id);
    if (!elem) return;
    elem.addEventListener('change', function() {
        (!this.checked) ? removeFilter(layer, filterClass) : addFilter(layer, filterClass, filterExpression);
    });
}

// Spielplatzfilter
onFilterChange('filterPrivate',     'playgrounds', 'access',       "access = 'yes' OR access IS NULL");
// TODO (GeoServer): filterArea und area_class-Klassifizierung (Mini/Klein/Groß/Riesen-Spielplatz) benötigen
// vorberechnete area_class-Attribute aus einem GeoServer sowie das zugehörige SLD-Styling (style/playgrounds.sld).
// UI-Element (#filterArea) und Legende wurden bereits entfernt. Wieder aktivieren, sobald ein GeoServer angebunden wird.
// onFilterChange('filterArea', 'playgrounds', 'area', "area_class > 0");
onFilterChange('filterWater',       'playgrounds', 'water',        "is_water = true");
onFilterChange('filterBaby',        'playgrounds', 'baby',         "for_baby = true");
onFilterChange('filterToddler',     'playgrounds', 'toddler',      "for_toddler = true");
onFilterChange('filterWheelchair',  'playgrounds', 'wheelchair',   "for_wheelchair = true");
onFilterChange('filterBench',       'playgrounds', 'bench',        "bench_count > 0");
onFilterChange('filterPicnic',      'playgrounds', 'picnic',       "picnic_count > 0");
onFilterChange('filterShelter',     'playgrounds', 'shelter',      "shelter_count > 0");
onFilterChange('filterTableTennis', 'playgrounds', 'table_tennis', "table_tennis_count > 0");
onFilterChange('filterSoccer',      'playgrounds', 'soccer',       "has_soccer = true");
onFilterChange('filterBasketball',  'playgrounds', 'basketball',   "has_basketball = true");

// filterShadow needs dynamic expression — can't use the helper
{
    const filterShadowEl = document.getElementById('filterShadow');
    if (filterShadowEl) filterShadowEl.addEventListener('change', function() {
        (!this.checked) ? removeFilter('playgrounds', 'shadow')
            : addFilter('playgrounds', 'shadow', `shadow_0${getValidMonth(getSliderMonth())}_${getFixedSliderHour(getSliderHour())} >= 50`);
    });
}

function getFixedSliderHour(hour) {
    return (hour < 10) ? `0${hour}` : hour;
}


// Datenprobleme anzeigen
{
    const showIssuesEl = document.getElementById('show-map-issues');
    if (showIssuesEl) showIssuesEl.addEventListener('change', function() {
        dataIssues.setVisible(this.checked);
    });
}

// Datenprobleme-Filter
// zu Beginn sind die Schatten-Issues ausgeblendet
function onIssueFilterChange(id, filterClass, expression) {
    const elem = document.getElementById(id);
    if (!elem) return;
    elem.addEventListener('change', function() {
        (this.checked) ? removeFilter('completeness', filterClass) : addFilter('completeness', filterClass, expression);
    });
}
onIssueFilterChange('filter-map-issues-1', '01', "not bug_level = '1'");
onIssueFilterChange('filter-map-issues-2', '02', "not bug_level = '2'");
onIssueFilterChange('filter-map-issues-3', '03', "not bug_level = '3'");
onIssueFilterChange('filter-map-issues-4', '04', "not bug_level = '4'");
onIssueFilterChange('filter-map-issues-5', '05', "not bug_level = '5'");