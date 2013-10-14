var strip = require("strip");
var scrape = require("scrape-url");
var debug = require("local-debug")('pull');
var slugify = require("slugify");

module.exports = {
  city: city,
  set: set,
  sets: sets
};

function set (url, callback) {
  debug('Pulling %s', url);

  var set = {
    title: undefined,
    source: url,
    photos: []
  };

  (function iter () {
    photo(url, function (error, result) {
      if (error) return callback(error);
      if (!result) return callback(undefined, set);

      set.title || (set.title = result.title);

      set.photos.push({
        source: result.photo,
        text: result.desc
      });

      if (result.next) {
        url = result.next;
        return iter();
      }

      callback(undefined, set);
    });

  })();
}

function photo (url, callback) {
  debug('Scraping photo at %s', url);

  scrape(url, ['.galeribuyukresim a[target=_blank]', '.galerirate span', '.galerirate span a', '.F_Sayfalama span a', '.F_fotogaleridetaybaslik'], function (error, photoLink, text, newsLink, nextLink, title) {
    if(error) return callback(error);
    if (photoLink.length == 0) {
      debug('FAILED: %s', url);
      return callback();
    }

    var photo = fixPhotoURL(photoLink[0].href);
    var desc = text[0].innerHTML;
    var link = newsLink && newsLink[0] && newsLink[0].href;
    var next = nextLink.slice(-2, -1)[0].href;
    title = title[0].innerHTML;

    desc = desc.slice(0, desc.indexOf('<'));

    if (nextLink[nextLink.length-1].innerHTML.slice(0,3) != 'Son') next = undefined;

    callback(undefined, { photo: photo, desc: desc, link: link, title: title, next: next });
  });

}

function fixPhotoURL (url) {
  var filename = url.match(/fotoid=\d+\/(.*)/)[1];
  var id = url.match(/galeri(\w+)/)[1];

  return 'http://www.kesfetmekicinbak.com/images/fotogaleri/galeri' + id + '/' + filename;
}

function sets (n, callback) {
  debug('Pulling the sets at page #%d', n);

  scrape('http://www.kesfetmekicinbak.com/fotogaleri/default.aspx?Page=' + n, '#tabdiv5 td > div > a img', function (error, matches) {
    if(error) return callback(error);

    callback(undefined, matches.map(function (el) {
      var title = strip(el.parentNode.parentNode.innerHTML);
      return { title: title, link: '/set/' + slugify(title).toLowerCase().replace(/'/g, ''), source: el.parentNode.href };
    }));
  });
}

function parseContent (text) {
  var parts = text.split(/\s*<br>\s*/g).filter(notNil);

  return parts.map(function (part) {
    var title = part.match(/^<strong>([^<]+)<\/strong>:/);
    var text = part.match(/:\s*(.*)/);

    return title ? { title: title[1], content: strip(text[1]) } : { text: strip(part) };
  });
}

function notNil (el) {
  return !!el;
}

function city (id, callback) {
  debug('Pulling city #%d', id);

  var record = {
    name: undefined,
    intro: undefined,
    photos: undefined,
    spots: undefined,
    article: undefined,
    hotels: undefined,
    source: 'http://www.kesfetmekicinbak.com/a/kent'+id+'.aspx'
  };

  var selectors = [
    '.siteMapping a', // city name
    '#divmetin div > span', // content
    '#divmetin div > span a' // photoset link
  ];

  scrape(record.source, selectors, function (error, name, content, photoset) {
    record.name = strip(name[0].innerHTML);
    record.intro = strip(content[0].innerHTML);

    var photosetURL = photoset.length && photoset[0].href;

    scrape(record.source + '?param=3', selectors[1], function (error, spots) {
      if (spots.length && spots[0].innerHTML) {
        record.spots = parseContent(spots[0].innerHTML);
      }

      scrape(record.source + '?param=5', selectors[1], function (error, article) {
        if (article.length && article[0].innerHTML) {
          record.article = strip(article[0].innerHTML);
        }

        if (!photosetURL) {
          callback(undefined, record);
        }

        set(photosetURL, function (error, result) {
          record.photos = result;
          callback(undefined, record);
        });

      });

    });

  });
}
