function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function initializeMemberSearch() {
  document
    .querySelectorAll<HTMLElement>('[data-member-directory]')
    .forEach((directory) => {
      const controls = directory.querySelector<HTMLElement>('.member-search');
      const input = directory.querySelector<HTMLInputElement>(
        'input[type="search"]',
      );
      const clear = directory.querySelector<HTMLButtonElement>(
        '[data-clear-search]',
      );
      const count = directory.querySelector<HTMLElement>('[data-member-count]');
      const empty = directory.querySelector<HTMLElement>('[data-no-members]');
      const rows = [
        ...directory.querySelectorAll<HTMLTableRowElement>('[data-member-row]'),
      ].map((element) => ({
        element,
        text: normalize(element.dataset.search ?? ''),
        district: Number(element.dataset.district),
        electionYear: Number(element.dataset.electionYear),
      }));
      if (!controls || !input || !clear || !count || !empty) return;

      const update = () => {
        const terms = normalize(input.value)
          .trim()
          .split(/\s+/)
          .filter(Boolean);
        let shown = 0;
        for (const row of rows) {
          const matches = terms.every((term) =>
            /^\d+$/.test(term)
              ? (term.length === 4 ? row.electionYear : row.district) ===
                Number(term)
              : row.text.includes(term),
          );
          row.element.hidden = !matches;
          if (matches) shown++;
        }
        count.textContent = `${shown} of ${rows.length} members`;
        empty.hidden = shown > 0;
        clear.disabled = input.value.length === 0;
      };

      input.addEventListener('input', update);
      clear.addEventListener('click', () => {
        input.value = '';
        update();
        input.focus();
      });
      controls.hidden = false;
      update();
    });
}
