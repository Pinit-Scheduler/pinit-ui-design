/* Keep each dialog's action footer outside its scrolling content. */
paths.minus='<path d="M5 12h14"/>';
let dialogFormCounterV11=0;
const modalBeforeFixedV11=modal;
modal=function(content){modalBeforeFixedV11(content);const dialog=document.querySelector('.dialog');if(!dialog)return;const head=dialog.querySelector('.dialog-head'),actions=[...dialog.querySelectorAll('.dialog-actions')].at(-1),body=document.createElement('div');body.className='dialog-scroll-v11';dialog.classList.add('dialog-fixed-v11');
 if(actions){const form=actions.closest('form');if(form){if(![...actions.querySelectorAll('button')].some(b=>/^(취소|닫기|뒤로)$/.test(b.textContent.trim()))){const cancel=document.createElement('button');cancel.type='button';cancel.className='btn';cancel.textContent='취소';cancel.onclick=()=>closeModal();actions.prepend(cancel);}if(!form.id)form.id='dialogFormV11-'+(++dialogFormCounterV11);actions.querySelectorAll('button,input').forEach(button=>{if(!button.hasAttribute('form'))button.setAttribute('form',form.id);});}actions.remove();actions.classList.add('dialog-footer-v11');}
 [...dialog.childNodes].forEach(node=>{if(node!==head)body.appendChild(node);});dialog.appendChild(body);
 if(actions)dialog.appendChild(actions);else{const footer=document.createElement('div');footer.className='dialog-actions dialog-footer-v11';footer.innerHTML='<button type="button" class="btn" onclick="closeModal()">닫기</button>';dialog.appendChild(footer);}
};
const taskFormBeforeRefinementV11=openTaskFormV2;
openTaskFormV2=function(id){taskFormBeforeRefinementV11(id);const form=document.querySelector('.dialog form'),task=tasks.find(t=>t.id===id);if(!form)return;form.classList.add('task-form-v11');
 const tagHead=[...form.querySelectorAll('h3')].find(el=>el.textContent.startsWith('추가 태그')||el.textContent==='태그');
 if(tagHead){let node=tagHead.nextElementSibling;while(node&&!node.querySelector('#repeatEnabledV2')&&node.id!=='dependencyFieldsV2'){const next=node.nextElementSibling;if(node.querySelector('#newTagV2')){node.remove();break;}node.remove();node=next;}tagHead.remove();}
 const retained=document.createElement('input');retained.type='hidden';retained.id='taskTagsRetainedV11';retained.value=JSON.stringify(task?.tags||[]);form.appendChild(retained);
 const metrics=document.getElementById('taskImportanceV2').closest('.form-row'),duration=document.getElementById('taskDurationV2').closest('.field');metrics.classList.add('task-metrics-v11');metrics.appendChild(duration);
 const sequence=document.getElementById('dependencyFieldsV2'),error=document.getElementById('taskErrorV2');if(sequence&&error)form.insertBefore(sequence,error);
 document.getElementById('taskTitleV2').focus({preventScroll:true});
};
