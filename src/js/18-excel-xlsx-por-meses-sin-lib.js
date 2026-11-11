  /* ---- Excel (.xlsx) por meses, sin librerías ---- */
  var CRC_T = null;
  function crc32(u) {
    if (!CRC_T) { CRC_T = []; for (var n = 0; n < 256; n++) { var c = n, k; for (k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC_T[n] = c >>> 0; } }
    var r = 0xFFFFFFFF, i;
    for (i = 0; i < u.length; i++) r = CRC_T[(r ^ u[i]) & 255] ^ (r >>> 8);
    return (r ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStore(files) {
    var enc = new TextEncoder(), parts = [], cen = [], off = 0;
    var u16 = function (v) { return [v & 255, (v >>> 8) & 255]; }, u32 = function (v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; };
    files.forEach(function (f) {
      var nm = enc.encode(f.name), d = enc.encode(f.data), crc = crc32(d), dd = (46 << 9) | (1 << 5) | 1;
      var lh = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(dd), u32(crc), u32(d.length), u32(d.length), u16(nm.length), u16(0));
      parts.push(new Uint8Array(lh), nm, d);
      cen.push({ nm: nm, crc: crc, len: d.length, off: off, dd: dd });
      off += lh.length + nm.length + d.length;
    });
    var cs = off;
    cen.forEach(function (c) {
      var ch = [].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(c.dd), u32(c.crc), u32(c.len), u32(c.len), u16(c.nm.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(c.off));
      parts.push(new Uint8Array(ch), c.nm);
      off += ch.length + c.nm.length;
    });
    parts.push(new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(cen.length), u16(cen.length), u32(off - cs), u32(cs), u16(0))));
    var total = 0; parts.forEach(function (p) { total += p.length; });
    var out = new Uint8Array(total), pos = 0;
    parts.forEach(function (p) { out.set(p, pos); pos += p.length; });
    return out;
  }
  function xmlEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''); }
  function colName(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function sheetXml(rows, widths, moneyCols) {
    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>';
    widths.forEach(function (w, i) { x += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; });
    x += '</cols><sheetData>';
    rows.forEach(function (r, ri) {
      x += '<row r="' + (ri + 1) + '">';
      r.forEach(function (v, ci) {
        var ref = colName(ci) + (ri + 1), head = ri === 0, money = moneyCols.indexOf(ci) >= 0;
        if (typeof v === 'number' && isFinite(v)) x += '<c r="' + ref + '" s="' + (money ? 1 : 0) + '"><v>' + v + '</v></c>';
        else if (v === '' || v == null) x += '<c r="' + ref + '"/>';
        else x += '<c r="' + ref + '" t="inlineStr"' + (head ? ' s="2"' : '') + '><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>';
      });
      x += '</row>';
    });
    return x + '</sheetData></worksheet>';
  }
  function exportXlsx() {
    var head = ['Fecha', 'Tipo', 'Categoría', 'Cuenta', 'Monto', 'Moneda', 'Monto en ' + (state.cur === 'USD' ? 'US$' : 'RD$'), 'Estado', 'Ahorro %', 'Nota'];
    var rows = exportRows('todo'), byM = {}, sheets = [], summ = {};
    rows.forEach(function (r) { var k = String(r[0]).slice(0, 7); (byM[k] = byM[k] || []).push(r); });
    state.txs.forEach(function (t) {
      if (!inCur(t) || t.pending) return;
      var k = t.date.slice(0, 7), s = summ[k] || (summ[k] = { i: 0, g: 0 });
      if (t.kind === 'ingreso') s.i += val(t); else s.g += val(t);
    });
    var keys = Object.keys(summ).sort(), sr = [['Mes', 'Ingresos', 'Gastos', 'Balance']], TI = 0, TG = 0;
    keys.forEach(function (k) { var s = summ[k]; TI += s.i; TG += s.g; sr.push([k, r2(s.i), r2(s.g), r2(s.i - s.g)]); });
    sr.push(['Total', r2(TI), r2(TG), r2(TI - TG)]);
    sheets.push({ name: 'Resumen', xml: sheetXml(sr, [14, 16, 16, 16], [1, 2, 3]) });
    Object.keys(byM).sort().forEach(function (k) { sheets.push({ name: k, xml: sheetXml([head].concat(byM[k]), [12, 14, 20, 16, 14, 9, 16, 11, 10, 30], [4, 6]) }); });
    var files = [
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map(function (s, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + sheets.map(function (s, i) { return '<sheet name="' + xmlEsc(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (s, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'xl/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' }
    ];
    sheets.forEach(function (s, i) { files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: s.xml }); });
    return saveFile('mis-finanzas-por-meses.xlsx', zipStore(files));
  }

