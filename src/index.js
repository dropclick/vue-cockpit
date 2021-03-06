var init = function (options) {
  var data = {
    cockpitUrl: options.cockpitUrl,
    apiKey: options.apiKey,
    selector: options.selector,
    basePath: location.pathname.slice(0, -1),
    collections: {},
    regions: {},
    collectionsLoaded: false,
    regionsLoaded: false,
    imagePathsLoaded: false,
    loaded: false,
    thumbnailWidth: options.thumbnailWidth? options.thumbnailWidth : 1920,
    thumbnailQuality: options.thumbnailQuality? options.thumbnailQuality : 70,
    totalNumberOfImageFields: 0,
    totalNumberOfImagePathRequests: 0,
  }

  var hasCookie = document.cookie.length > 0;
  var showHints = window.location.search.indexOf('hint') >= 0;
  var buttonText = showHints ? 'Hide hints' : 'Show hints';

  if (hasCookie)
    $('body').append('<button id="toggleSegmentHints" class="" style="position: fixed; top: 0; right: 0; z-index: 999999; background-color: #555; color: #fff; cursor: pointer; border: 0; font-family: Sans-Serif; font-size: 14px; padding: 10px 15px;">' + buttonText + '</button>')

  $('#toggleSegmentHints').click(function () {
    var location = window.location.href.split('#')[0];
    if (showHints)
      window.location.href = location.replace('?hints', '');
    else
      window.location.href = location + '?hints';
  });

  if (showHints > 0) {

    var linkToCockpit = function (element, entityType, entityName, entityAttr) {
      if (element.parents('.has-binding').length == 0) {
        element.css('outline', '1px dashed red').css('cursor', 'pointer');
        element.attr('entity-type', entityType);
        element.attr('entity-name', entityName);
        element.attr('title', entityType + ' > ' + entityName + (entityAttr && entityAttr.indexOf(' ') == -1 ? (' > ' + entityAttr) : ''));
        element.addClass('has-binding');
      }
    }

    $(':not(:has(div)):contains("{{")').each(function () {
      var $this = $(this);
      var text = $this.text();
      if (text.indexOf('regions.') > 0 || text.indexOf('collections.') > 0) {
        var segments = text.trim().replace('{{', '').replace('}}', '').split('.');
        var entityType = segments[0];
        var entityName = segments[1];
        var entityAttr = segments[2];
        linkToCockpit($this, entityType, entityName, entityAttr);
      }
    });

    $('[v-for]').each(function () {
      var $this = $(this);
      var text = $this.attr('v-for');
      var operator = text.indexOf(' in ') > 0 ? 'in' : 'of';
      var entityType = text.split(' ' + operator + ' ')[1].split('.')[0];
      var entityName = text.split('.')[1];
      var entityAttr = text.split('.')[2];
      linkToCockpit($this, entityType, entityName, entityAttr);
    });

    $('[v-html]').each(function () {
      var $this = $(this);
      var text = $this.attr('v-html');
      var segments = text.split('.');
      var entityType = segments[0];
      var entityName = segments[1];
      var entityAttr = segments[2];
      linkToCockpit($this, entityType, entityName, entityAttr);
    });

    $('[v-bind\\:href]').each(function () {
      var $this = $(this);
      var text = $this.attr('v-bind:href');
      var segments = text.split('.');
      var entityType = 'regions';
      var entityName = segments[1];
      var entityAttr = segments[2];
      linkToCockpit($this, entityType, entityName, entityAttr);
    });

    $('[v-bind\\:src]').each(function () {
      var $this = $(this);
      var text = $this.attr('v-bind:src');
      var segments = text.split('.');
      var entityType = 'regions';
      var entityName = segments[1];
      var entityAttr = segments[2];
      linkToCockpit($this, entityType, entityName, entityAttr);
    });

    $('body').on('click', '.has-binding', function ($event) {
      var $this = $(this);
      var entityType = $this.attr('entity-type');
      var entityName = $this.attr('entity-name');
      var action = entityType == 'regions' ? 'form' : 'entries';
      var url = data.cockpitUrl + '/' + entityType + '/' + action + '/' + entityName;
      window.open(url);
      //window.location.href = url;
    });
  }

  fetch(data.cockpitUrl + '/api/collections/listCollections?token=' + data.apiKey)
    .then(function (response) {
      return response.json()
    }).then(function (collectionNames) {
      data.collectionNames = collectionNames
      collectionNames.forEach(function (collectionName) {
        data.collections[collectionName] = [];
      });
      fetch(data.cockpitUrl + '/api/regions/listRegions?token=' + data.apiKey)
        .then(function (response) {
          return response.json()
        }).then(function (regionNames) {
          data.regionNames = regionNames;
          regionNames.forEach(function (regionName) {
            data.regions[regionName] = [];
          });
          new Vue({
            el: data.selector,
            data: data,
            created: function () {
              this.fetchAllCollectionEntries();
              this.fetchAllRegionEntries();
            },
            methods: {
              fetchAllRegionEntries: function () {
                var self = this;
                this.regionNames.forEach(function (regionName, i, array) {
                  var isLast = i == array.length - 1;
                  self.fetchRegionEntries(regionName, isLast);
                });
              },
              fetchRegionEntries: function (regionName, isLast) {
                var self = this;
                fetch(data.cockpitUrl + '/api/regions/data/' + regionName + '?token=' + this.apiKey)
                  .then(function (response) {
                    return response.json();
                  }).then(function (json) {
                    self.regions[regionName] = json;
                    self.regionsLoaded = self.regionsLoaded || isLast;
                    if (self.regionsLoaded && self.collectionsLoaded && options.callback)
                      options.callback();
                  }).catch(function (ex) {
                    console.log('parsing failed', ex)
                  })
              },
              fetchAllCollectionEntries: function () {
                var self = this;
                this.collectionNames.forEach(function (collectionName, i, array) {
                  var isLast = i == array.length - 1;
                  self.fetchCollectionEntries(collectionName, isLast);
                });
              },
              fetchCollectionEntries: function (collectionName, isLast) {
                var self = this;
                fetch(data.cockpitUrl + '/api/collections/get/' + collectionName + '?token=' + this.apiKey)
                  .then(function (response) {
                    return response.json();
                  }).then(function (json) {
                    var numberOfImageFieldsPerEntry = 0;
                    Object.keys(json.fields).forEach(function (key) {
                      if (json.fields[key].type == 'image')
                        numberOfImageFieldsPerEntry += 1;
                    });
                    self.totalNumberOfImageFields += numberOfImageFieldsPerEntry * json.entries.length;
                    if (isLast && self.totalNumberOfImageFields == 0) {
                      console.log('aha');
                      self.imagePathsLoaded = true;
                    }
                    json.entries.forEach(function (entry) {
                      Object.keys(entry).forEach(function (key) {
                        if (entry[key].path) {
                          fetch(data.cockpitUrl + '/api/cockpit/image?token=' + self.apiKey, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              'src': entry[key].path,
                              'm': 'resize',
                              'w': data.thumbnailWidth,
                              'q': data.thumbnailQuality
                            })
                          })
                            .then(function (response) {
                              return response.text();
                            }).then(function (text) {
                              entry[key].thumbnailPath = text;
                              self.totalNumberOfImagePathRequests += 1;
                              console.log(self.totalNumberOfImageFields + ':' + self.totalNumberOfImagePathRequests);
                              self.imagePathsLoaded = self.totalNumberOfImageFields == self.totalNumberOfImagePathRequests;
                              if (self.regionsLoaded && self.collectionsLoaded && self.imagePathsLoaded && options.callback) {
                                self.loaded = true;
                                options.callback();
                              }
                            }).catch(function (ex) {
                              self.totalNumberOfImagePathRequests += 1;
                              self.imagePathsLoaded = self.totalNumberOfImageFields == self.totalNumberOfImagePathRequests;
                              if (self.regionsLoaded && self.collectionsLoaded && self.imagePathsLoaded && options.callback) {
                                self.loaded = true;
                                options.callback();
                              }
                              console.log('parsing failed', ex)
                            })
                        }
                      });
                    })
                    self.collections[collectionName] = json.entries;
                    self.collectionsLoaded = self.collectionsLoaded || isLast;
                    if (self.regionsLoaded && self.collectionsLoaded && self.imagePathsLoaded && options.callback) {
                      self.loaded = true;
                      options.callback();
                    }
                  }).catch(function (ex) {
                    console.log('parsing failed', ex)
                  })
              }
            }
          })
        })
    }).catch(function (ex) {
      console.log('parsing failed', ex)
    })
}

module.exports = {
  init: init
}