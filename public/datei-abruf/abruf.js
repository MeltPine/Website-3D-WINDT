/*
 * Internal retrieval page for customer uploads. The signed link parameters
 * (d, u, f, e, s) authorise access; chunks are fetched one by one from
 * /api/uploads/file, verified against their SHA-256 and joined locally,
 * so every part is verified before the file is assembled in the browser.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var query = new URLSearchParams();
  ['d', 'u', 'f', 'e', 's'].forEach(function (key) {
    var value = params.get(key);
    if (value) query.set(key, value);
  });

  var nameNode = document.getElementById('file-name');
  var sizeNode = document.getElementById('file-size');
  var dateNode = document.getElementById('file-date');
  var button = document.getElementById('download');
  var progress = document.getElementById('progress');
  var statusNode = document.getElementById('status');
  var manifest = null;

  function setStatus(text, isError) {
    statusNode.textContent = text;
    statusNode.className = isError ? 'status error' : 'status';
  }

  function formatMb(bytes) {
    return (bytes / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' MB';
  }

  function toBase64url(buffer) {
    var bytes = new Uint8Array(buffer);
    var binary = '';
    for (var i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function readError(response) {
    return response.json().then(
      function (body) { return body && body.error ? body.error : 'HTTP ' + response.status; },
      function () { return 'HTTP ' + response.status; }
    );
  }

  function fetchChunk(index) {
    var chunkQuery = new URLSearchParams(query);
    chunkQuery.set('chunk', String(index));
    return fetch('/api/uploads/file?' + chunkQuery.toString(), { credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) {
          return readError(response).then(function (message) { throw new Error(message); });
        }
        return response.arrayBuffer();
      })
      .then(function (data) {
        return crypto.subtle.digest('SHA-256', data).then(function (digest) {
          if (toBase64url(digest) !== manifest.chunkSha256[index]) {
            throw new Error('Prüfsumme von Teil ' + (index + 1) + ' stimmt nicht.');
          }
          return data;
        });
      });
  }

  function download() {
    button.disabled = true;
    progress.hidden = false;
    progress.max = manifest.chunks;
    progress.value = 0;
    var parts = [];
    var index = 0;

    function next() {
      if (index >= manifest.chunks) {
        var blob = new Blob(parts, { type: 'application/octet-stream' });
        if (blob.size !== manifest.size) {
          throw new Error('Dateigröße stimmt nicht (' + blob.size + ' statt ' + manifest.size + ' Byte).');
        }
        var url = URL.createObjectURL(blob);
        var anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = manifest.name;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        setStatus('Download abgeschlossen, Prüfsummen korrekt.', false);
        button.disabled = false;
        return undefined;
      }
      setStatus('Lade Teil ' + (index + 1) + ' von ' + manifest.chunks + ' …', false);
      return fetchChunk(index).then(function (data) {
        parts.push(data);
        index += 1;
        progress.value = index;
        return next();
      });
    }

    Promise.resolve()
      .then(next)
      .catch(function (error) {
        setStatus('Abruf fehlgeschlagen: ' + error.message, true);
        button.disabled = false;
      });
  }

  if (!query.get('u') || !query.get('s')) {
    setStatus('Dieser Link ist unvollständig.', true);
    return;
  }

  fetch('/api/uploads/file?' + query.toString(), { credentials: 'same-origin' })
    .then(function (response) {
      if (!response.ok) {
        return readError(response).then(function (message) { throw new Error(message); });
      }
      return response.json();
    })
    .then(function (data) {
      manifest = data;
      nameNode.textContent = data.name;
      sizeNode.textContent = formatMb(data.size);
      dateNode.textContent = data.uploadedAt ? new Date(data.uploadedAt).toLocaleString('de-DE') : '–';
      button.disabled = false;
      setStatus('Bereit.', false);
    })
    .catch(function (error) {
      setStatus(error.message, true);
    });

  button.addEventListener('click', download);
})();
