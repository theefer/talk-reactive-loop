import h from 'virtual-dom/h';
import diff from 'virtual-dom/diff';
import patch from 'virtual-dom/patch';

import Rx from 'rx';

import virtualize from 'vdom-virtualize';

// Other helpers
import {container$, sequenceCombine$, preloadImage$} from './helpers';


// Convenience
const $Obs = Rx.Observable;


// Image API search
import reqwest from 'reqwest';

import {mediaApiUri} from './api-config';

function searchImages$({query, free}) {
  const freeFilter = free ? {free: true} : {};
  const req = reqwest({
    url: `${mediaApiUri}/images`,
    type: 'json',
    data: Object.mixin({
      q: query,
      valid: true,
      length: 30
    }, freeFilter),
    crossOrigin: true,
    withCredentials: true
  });

  return $Obs.fromPromise(req);
}

// Fallback if no API available
// import {searchImages} from './fake-api';



function inputElement(value, changed$) {
  return h('input', {
    type: 'text',
    placeholder: 'Enter query...',
    value: value,
    oninput: (event) => changed$.onNext(event)
  });
}

function inputView() {
  const changed$ = new Rx.Subject;

  function render$(model) {
    return model.value$.map(val => inputElement(val, changed$));
  }

  return {
    render$,
    events: {changed$}
  };
}

function inputIntent(view) {
  return {
    update$: view.events.changed$.map(ev => ev.target.value)
  };
}

function inputModel(intent) {
  return {
    value$: intent.update$.startWith('')
  };
}


function inputComponent() {
  const view = inputView();
  const model = inputModel(inputIntent(view));

  return {
    model,
    tree$: view.render$(model)
  };
}



function filtersComponent() {
  const query = inputComponent();

  return {
    model: {
      query$: query.model.value$
    },
    tree$: query.tree$
  };
}

function imageCell(src) {
  return h(`span.image`, [
    h('img', {src})
  ]);
}

function resultListComponent() {
  const heading$ = $Obs.return(h('h2', `Search results`));

  const tree$ = heading$;

  return {tree$};
}


function view() {
  const filters = filtersComponent();

  const resultList = resultListComponent();

  const tree$ = container$('div', [
    filters.tree$,
    resultList.tree$
  ]);

  return {
    tree$
  };
}


const out = document.getElementById('out');

const initialDom = virtualize(out);

const theView = view();

theView.tree$.
    startWith(initialDom).
    bufferWithCount(2, 1).
    filter(pair => pair.length == 2).
    map(([last, current]) => diff(last, current)).
    reduce((out, patches) => patch(out, patches), out).
    subscribeOnError(err => console.error(err));
