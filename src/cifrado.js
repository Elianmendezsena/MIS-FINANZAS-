/* Cifrado con PIN: PBKDF2 (SHA-256) -> AES-GCM de 256 bits. Los datos cifrados viven en 'finanzas-enc'.
   Este archivo corre antes que la app: si hay datos cifrados, pide el PIN y solo entonces arranca. */
window.MFC = (function () {
  var ENC = 'finanzas-enc', TRY = 'finanzas-try', ITER = 310000, te = new TextEncoder(), td = new TextDecoder();
  function b64(buf) { var s = '', b = new Uint8Array(buf), i; for (i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); }
  function ub64(s) { var r = atob(s), u = new Uint8Array(r.length), i; for (i = 0; i < r.length; i++) u[i] = r.charCodeAt(i); return u; }
  function ok() { return !!(window.crypto && crypto.subtle && window.TextEncoder); }
  function derive(pin, salt64, iter) {
    return crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveKey']).then(function (k) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: ub64(salt64), iterations: iter, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    });
  }
  function newMeta() { return { s: b64(crypto.getRandomValues(new Uint8Array(16))), n: ITER }; }
  function seal(key, text, meta) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, te.encode(text)).then(function (ct) { return JSON.stringify({ v: 1, s: meta.s, n: meta.n, iv: b64(iv), ct: b64(ct) }); });
  }
  function open(key, rec) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: ub64(rec.iv) }, key, ub64(rec.ct)).then(function (pt) { return td.decode(pt); }); }
  function rec() { try { var r = localStorage.getItem(ENC); r = r ? JSON.parse(r) : null; return r && r.ct && r.s ? r : null; } catch (e) { return null; } }
  /* Intentos fallidos: desde el 5.º hay que esperar (30 s, 1 min, 2 min… hasta 15 min) */
  function tries() { try { return JSON.parse(localStorage.getItem(TRY) || '{}') || {}; } catch (e) { return {}; } }
  function waitSecs() { var t = tries(); return t.until && t.until > Date.now() ? Math.ceil((t.until - Date.now()) / 1000) : 0; }
  function fail() { var t = tries(); t.n = (t.n || 0) + 1; if (t.n >= 5) t.until = Date.now() + Math.min(900, 30 * Math.pow(2, t.n - 5)) * 1000; try { localStorage.setItem(TRY, JSON.stringify(t)); } catch (e) {} return t; }
  function clearTries() { try { localStorage.removeItem(TRY); } catch (e) {} }
  function waitMsg(s) { return 'Demasiados intentos. Espera ' + (s >= 60 ? Math.ceil(s / 60) + ' min' : s + ' s') + '.'; }
  /* Prueba un PIN contra los datos cifrados. Resuelve {key, plain, meta} o rechaza {msg}. */
  function tryPin(pin) {
    var r = rec(), w = waitSecs();
    if (!r) return Promise.reject({ msg: 'No hay datos cifrados.' });
    if (w) return Promise.reject({ msg: waitMsg(w) });
    return derive(pin, r.s, r.n).then(function (key) { return open(key, r).then(function (plain) { clearTries(); return { key: key, plain: plain, meta: { s: r.s, n: r.n } }; }); })
      .catch(function () { var t = fail(), w2 = waitSecs(); throw { msg: w2 ? 'PIN incorrecto. ' + waitMsg(w2) : 'PIN incorrecto.' + (t.n >= 3 ? ' Te quedan ' + (5 - t.n) + ' intentos antes de esperar.' : '') }; });
  }
  /* Llave guardada en el dispositivo (no exportable) para entrar con Face ID */
  function idb(mode, fn) {
    return new Promise(function (res, rej) {
      var q = indexedDB.open('mis-finanzas-llave', 1);
      q.onupgradeneeded = function () { q.result.createObjectStore('k'); };
      q.onerror = function () { rej(q.error); };
      q.onsuccess = function () { var tx = q.result.transaction('k', mode), rq = fn(tx.objectStore('k')); tx.oncomplete = function () { res(rq && rq.result); q.result.close(); }; tx.onerror = function () { rej(tx.error); }; };
    });
  }
  function keyPut(key) { return idb('readwrite', function (s) { return s.put(key, 'enc'); }); }
  function keyGet() { return idb('readonly', function (s) { return s.get('enc'); }); }
  function keyDel() { return idb('readwrite', function (s) { return s.delete('enc'); }).catch(function () {}); }
  function openWithStoredKey() {
    var r = rec();
    return keyGet().then(function (key) { if (!key || !r) throw 0; return open(key, r).then(function (plain) { clearTries(); return { key: key, plain: plain, meta: { s: r.s, n: r.n } }; }); });
  }
  function wipe() { try { localStorage.removeItem(ENC); localStorage.removeItem(TRY); localStorage.removeItem('finanzas-bio'); } catch (e) {} return keyDel(); }
  return { ENC: ENC, ok: ok, b64: b64, ub64: ub64, derive: derive, newMeta: newMeta, seal: seal, open: open, rec: rec, tryPin: tryPin, waitSecs: waitSecs, keyPut: keyPut, keyDel: keyDel, openWithStoredKey: openWithStoredKey, wipe: wipe };
})();
