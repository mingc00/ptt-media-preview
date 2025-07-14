function modifyBody(body) {
  return body.replace('</body>', function(match) {
    return `<script src="https://cdn.jsdelivr.net/gh/mingc00/ptt-media-preview@main/imgur.js" defer></script><script src="https://cdn.jsdelivr.net/gh/mingc00/ptt-media-preview@main/web.js" defer></script>`
      + match;
  });
}

const contentType = $response.headers['Content-Type'] || $response.headers['content-type'];
if (contentType?.startsWith('text/html')) {
  $done({ body: modifyBody($response.body) });
} else {
  $done();
}
