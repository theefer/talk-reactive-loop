import h from 'virtual-dom/h';
import diff from 'virtual-dom/diff';
import patch from 'virtual-dom/patch';

import Rx from 'rx';

import virtualize from 'vdom-virtualize';


// Convenience
const $Obs = Rx.Observable;


// Image API search
import reqwest from 'reqwest';

import {mediaApiUri} from './api-config';

function searchImages({query, free}) {
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


// Other helpers
function sequenceCombine$(observables$) {
  // Work around odd behaviour of combineLatest with empty Array
  // (never yields a value)
  if (observables$.length === 0) {
    return Rx.Observable.return([]);
  } else {
    return Rx.Observable.combineLatest(observables$, (...all) => all);
  }
}

function preloadImage$(src) {
  const loaded = new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', resolve);
    image.addEventListener('error', reject);
    image.src = src;
  });
  return Rx.Observable.fromPromise(loaded);
}




function container$(tagName, children) {
  return $Obs.combineLatest(
    children,
    (...views) => h(tagName, [...views])
  );
}


// TODO: split into MVI?
// TODO: close loop? (V = f(M))
function input() {
  const inputted$ = new Rx.Subject;
  const inputEl = h('input', {
    type: 'text',
    placeholder: 'Search images...',
    oninput: (event) => inputted$.onNext(event)
  });

  return {
    model: {
      value$: inputted$.map(event => event.target.value).startWith('')
    },
    tree$: $Obs.return(inputEl)
  };
}



function checkboxEl(checked, changed$) {
  return h('input', {
    type: 'checkbox',
    checked: checked,
    onchange: (event) => changed$.onNext(event)
  });
}

function checkboxView() {
  const changed$ = new Rx.Subject;

  function render$(model) {
    return model.checked$.map(checked => checkboxEl(checked, changed$));
  }

  return {
    render$,
    events: {changed$}
  };
}

function checkboxIntents(view) {
  return {
    change$: view.events.changed$.map(event => event.target.checked)
  };
}

function checkboxModel(intents) {
  return {
    checked$: intents.change$.startWith(false)
  };
}

function checkbox() {
  const view = checkboxView();
  const model = checkboxModel(checkboxIntents(view));

  return {
    model: {
      value$: model.checked$
    },
    tree$: view.render$(model)
  };
}


function freeFilter() {
  const choice = checkbox();
  const tree$ = choice.tree$.map(tree => h('label', [tree, 'free only']));

  return {
    model: choice.model,
    tree$: tree$
  };
}

function filtersView() {
  const queryInput = input();
  const freeChoice = freeFilter();

  return {
    model: {
      query$: queryInput.model.value$,
      free$:  freeChoice.model.value$
    },
    // tree$: $Obs.combineLatest(
    //   queryInput.tree$,
    //   freeChoice.tree$,
    //   (queryInputTree, freeChoiceTree) => {
    //     return h('form', [queryInputTree, freeChoiceTree]);
    //   })
    tree$: container$('form', [queryInput.tree$, freeChoice.tree$])
  };
}


function imageCell(src, loaded) {
  const state = loaded ? 'loaded' : 'loading';
  return h('span', {className: `image image--${state}`}, [
    h('img', {src: src})
  ]);
}

function resultsComponent({results$, query$}) {
  const resultsHeader$ = query$.map(query => {
    return h('h2', `Search results for “${query}”`);
  });

  const imageList$ = results$.flatMapLatest(results => {
    const imageEls$ = results.data.map(result => {
      const imageUrl = result.data.thumbnail.secureUrl;

      return preloadImage$(imageUrl).
        map(() => imageCell(imageUrl, true)).
        startWith(imageCell(imageUrl, false));
    });

    return sequenceCombine$(imageEls$).map(imageEls => {
      return h('div', imageEls);
    });
  });

  const tree$ = container$('div', [
    resultsHeader$,
    imageList$
  ]);

  return {
    tree$
  };
}

function view() {
  const filters = filtersView();

  const query$ = filters.model.query$.debounce(500);
  const free$ = filters.model.free$;

  const pollPeriod = 10000;

  const searchQuery$ = Rx.Observable.combineLatest(
    query$,
    free$,
    $Obs.timer(0, pollPeriod), // emits to refresh
    (query, free) => ({query, free})
  );

  const results$ = searchQuery$.
          flatMapLatest(searchQuery => searchImages(searchQuery));

  const results = resultsComponent({query$, results$});

  const tree$ = container$('div', [filters.tree$, results.tree$]);

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
    map(([last, current]) => diff(last, current)).
    reduce((out, patches) => patch(out, patches), out).
    subscribeOnError(err => console.error(err));
