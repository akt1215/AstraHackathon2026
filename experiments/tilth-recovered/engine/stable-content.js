const previousMarkup=new WeakMap();
// Preserve physical DOM controls between simulation observations. If a real
// change replaces one, restore focus by the full action identity.
export function replaceContent(element,markup){
 if(previousMarkup.get(element)===markup)return;
 const active=element.ownerDocument.activeElement;
 const identity=active&&element.contains(active)?Object.entries(active.dataset||{}):[];
 element.innerHTML=markup;previousMarkup.set(element,markup);
 if(identity.length){const replacement=[...element.querySelectorAll('button')].find(button=>identity.every(([key,value])=>button.dataset[key]===value));replacement?.focus({preventScroll:true});}
}
