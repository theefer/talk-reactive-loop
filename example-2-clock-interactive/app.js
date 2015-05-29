import Rx         from 'rx';
import moment     from 'moment';
import h          from 'virtual-dom/h';
import diff       from 'virtual-dom/diff';
import patch      from 'virtual-dom/patch';
import virtualize from 'vdom-virtualize';


function model(intent) {
  const ticker$ = Rx.Observable.interval(50);
  const date$ = ticker$.map(() => moment());

  const format$ = intent.toggle$.startWith('HH:mm').scan((format, _) => {
    return format === 'HH:mm' ? 'YYYY-MM-DD' : 'HH:mm';
  });

  const time$ = Rx.Observable.combineLatest(date$, format$, (date, format) => {
    return date.format(format);
  }).distinctUntilChanged();

  return time$;
}


function view() {
  const clicks$ = new Rx.Subject;

  function tree$(time$) {
    return time$.map(time => h('h1', {
      onclick: ev => clicks$.onNext(ev)
    }, time));
  };

  return {
    tree$,
    events: {clicks$}
  };
}

function intent(view) {
  return {
    // Discard event object
    toggle$: view.events.clicks$.map(() => true)
  };
}

const v = view();
const m = model(intent(v));


const out = document.getElementById('out');
const initialDom = virtualize(out);

v.tree$(m).
    startWith(initialDom).
    bufferWithCount(2, 1).
    map(([last, current]) => diff(last, current)).
    reduce((out, patches) => patch(out, patches), out).
    subscribeOnError(err => console.error(err));
