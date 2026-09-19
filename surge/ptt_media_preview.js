function modifyBody(body) {
  return body
    .replace('<head>', '<head>\n<meta name="color-scheme" content="dark">')
    .replace('</head>', function (match) {
      return (
        `<script type="module" src="https://cdn.jsdelivr.net/gh/mingc00/ptt-media-preview@v7.2.1/src/web.js"></script>` +
        match
      );
    });
}

const contentType = $response.headers['Content-Type'] || $response.headers['content-type'];
if (contentType?.startsWith('text/html')) {
  $done({ body: modifyBody($response.body) });
} else {
  $done();
}
