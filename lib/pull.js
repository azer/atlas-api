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
