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


import {inputComponent} from './components';

/*
export function inputComponent() {
  const view = inputView();
  const model = inputModel(inputIntent(view));

  return {
    model: {
      value$: model.value$
    },
    tree$: view.render$(model)
  };
}
*/


import {checkboxComponent} from './components';

function freeFilter() {
  const choice = checkboxComponent();
  const tree$ = choice.tree$.map(tree => h('label', [tree, 'free only']));

  return {
    model: choice.model,
    tree$: tree$
  };
}



function filtersComponent() {
  const query = inputComponent();
  const free = freeFilter();

  return {
    model: {
      query$: query.model.value$,
      free$:  free.model.value$
    },
    tree$: container$('form', [query.tree$, free.tree$])
  };
}

function imageCell(src, loaded) {
  const klass = loaded ? 'image--loaded' : 'image--loading';
  return h(`span.image.${klass}`, [
    h('img', {src})
  ]);
}

function resultListComponent(query$, results$) {
  const heading$ = query$.map(query => h('h2', `Search results for "${query}"`));

  const resultList$ = results$.flatMapLatest(results => {
    return container$('div', results.data.map(result => {
      const src = result.data.thumbnail.secureUrl;
      return preloadImage$(src).
        map(() => imageCell(src, true)).
        startWith(imageCell(src, false));
    }));
  });

  const tree$ = container$('div', [
    heading$,
    resultList$
  ]);

  return {tree$};
}


function view() {
  const filters = filtersComponent();

  const query$ = filters.model.query$.debounce(500);
  const free$ = filters.model.free$;

  const ticker$ = $Obs.timer(0, 1000);
  const searchQuery$ = $Obs.combineLatest(
    query$,
    free$,
    ticker$,
    (query, free, _) => ({query, free})
  );

  const results$ = searchQuery$.flatMapLatest(searchQuery => searchImages$(searchQuery));

  const resultList = resultListComponent(query$, results$);

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
