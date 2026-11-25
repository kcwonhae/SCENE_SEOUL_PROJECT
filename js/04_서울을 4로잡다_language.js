// 언어 선택 창 표시 기능 (번역 기능 없음)
(() => {
    const trigger = document.querySelector('.ss-language[aria-expanded]');
    if (!trigger) return;

    const menu = trigger.querySelector('.ss-language-menu');
    if (!menu) return;

    function setOpen(open) {
        trigger.setAttribute('aria-expanded', String(open));
        trigger.classList.toggle('is-open', open);
        menu.hidden = !open;
    }

    trigger.addEventListener('click', event => {
        if (event.target.closest('.ss-language-menu')) return;
        setOpen(menu.hidden);
    });

    trigger.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            setOpen(false);
            trigger.focus();
        } else if (event.target === trigger && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            setOpen(menu.hidden);
        }
    });

    document.addEventListener('click', event => {
        if (!trigger.contains(event.target)) setOpen(false);
    });
})();
