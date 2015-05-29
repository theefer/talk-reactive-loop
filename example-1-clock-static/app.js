import Rx         from 'rx';
import moment     from 'moment';
import h          from 'virtual-dom/h';
import diff       from 'virtual-dom/diff';
import patch      from 'virtual-dom/patch';
import virtualize from 'vdom-virtualize';


const ticker$ = Rx.Observable.interval(50);
const time$ = ticker$.
  map(() => moment()).
  map(t => t.format('HH:mm')).
  distinctUntilChanged();

const tree$ = time$.map(time => h('h1', time));

const out = document.getElementById('out');
const initialDom = virtualize(out);

tree$.
    startWith(initialDom).
    bufferWithCount(2, 1).
    map(([last, current]) => diff(last, current)).
    reduce((out, patches) => patch(out, patches), out).
    subscribeOnError(err => console.error(err));
