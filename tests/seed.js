/* Datos de prueba: se ejecuta dentro de la página (usa el reloj del navegador). */
module.exports = function () {
  const d = new Date(), mk = o => { const x = new Date(d.getFullYear(), d.getMonth() + o, 1); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0'); };
  const base = JSON.parse(localStorage.getItem('finanzas-personales-v1'));
  let L = [], i = 0;
  const tx = (m, day, kind, cat, amount, acc) => ({ id: 't' + (i++), kind, cat, amount, cur: 'DOP', date: mk(m) + '-' + String(day).padStart(2, '0'), acc, note: i % 3 ? '' : 'nota #x' });
  [[0, 'Comida', 4500, 'a1'], [0, 'Comida', 2500, 'a3'], [0, 'Transporte', 1800, 'a1'], [0, 'Alquiler', 15000, 'a2'], [0, 'Ocio', 3000, 'a3'], [0, 'Servicios', 2100, 'a2'], [-1, 'Comida', 5000, 'a1'], [-1, 'Alquiler', 15000, 'a2'], [-1, 'Ocio', 1000, 'a3'], [-1, 'Transporte', 2600, 'a1'], [-2, 'Comida', 6100, 'a1']].forEach((a, n) => L.push(tx(a[0], 1 + n % 8, 'gasto', a[1], a[2], a[3])));
  [[0, 'Salario', 40000, 'a2'], [-1, 'Salario', 38000, 'a2'], [0, 'Negocio', 6000, 'a1'], [-2, 'Salario', 38000, 'a2']].forEach(a => L.push(tx(a[0], 2, 'ingreso', a[1], a[2], a[3])));
  L.push({ id: 'tu', kind: 'gasto', cat: 'Ocio', amount: 25, cur: 'USD', date: mk(0) + '-03', acc: 'a1', note: '' });
  base.txs = L; base.welcomed = true;
  base.plan = [{ id: 'p1', mk: mk(0), kind: 'gasto', cat: 'Servicios', n: 'Luz', amount: 3000, cur: 'DOP', day: 25, acc: 'a2' }, { id: 'p2', mk: mk(0), kind: 'ingreso', cat: 'Salario', n: '', amount: 20000, cur: 'DOP', day: 30 }];
  localStorage.setItem('finanzas-personales-v1', JSON.stringify(base));
};
