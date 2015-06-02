import h from 'virtual-dom/h';
import Rx from 'rx';


// Convenience
const $Obs = Rx.Observable;

export function container$(tagName, children) {
  return $Obs.combineLatest(
    children,
    (...views) => h(tagName, [...views])
  );
};

export function sequenceCombine$(observables$) {
  // Work around odd behaviour of combineLatest with empty Array
  // (never yields a value)
  if (observables$.length === 0) {
    return Rx.Observable.return([]);
  } else {
    return Rx.Observable.combineLatest(observables$, (...all) => all);
  }
};

export function preloadImage$(src) {
  const loaded = new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', resolve);
    image.addEventListener('error', reject);
    image.src = src;
  });
  return Rx.Observable.fromPromise(loaded);
};
