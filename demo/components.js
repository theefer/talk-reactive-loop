import h from 'virtual-dom/h';

import Rx from 'rx';


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


export function inputComponent() {
  const view = inputView();
  const model = inputModel(inputIntent(view));

  return {
    model,
    tree$: view.render$(model)
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

export function checkboxComponent() {
  const view = checkboxView();
  const model = checkboxModel(checkboxIntents(view));

  return {
    model: {
      value$: model.checked$
    },
    tree$: view.render$(model)
  };
}
