(() => {
  const invitation = document.getElementById('invitation');
  const accepted = document.getElementById('accepted');
  const declined = document.getElementById('declined');
  const acceptButton = document.getElementById('accept-button');
  const declineButton = document.getElementById('decline-button');
  const declineSlot = document.getElementById('decline-slot');
  const acceptedBack = document.getElementById('accepted-back');
  const canvas = document.getElementById('confetti');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const originalDecline = declineButton.textContent.trim();
  const replies = [
    'Ơ, em bận thật à?',
    'Ngồi một tiếng thôi mà',
    'Thế cuối tuần thì sao?',
    'Để hôm khác nhé',
  ];
  let dodges = 0;
  let dodgeAnimation;

  function viewportBounds() {
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    return {
      left,
      top,
      right: left + (viewport?.width ?? document.documentElement.clientWidth),
      bottom: top + (viewport?.height ?? window.innerHeight),
    };
  }

  function overlaps(first, second, gap = 0) {
    return first.left < second.right + gap && first.right > second.left - gap &&
      first.top < second.bottom + gap && first.bottom > second.top - gap;
  }

  function chooseLandingSpot(previous, pointer) {
    const view = viewportBounds();
    const { width, height } = declineButton.getBoundingClientRect();
    const minX = view.left + 12;
    const minY = view.top + 12;
    const maxX = Math.max(minX, view.right - width - 12);
    const maxY = Math.max(minY, view.bottom - height - 12);
    const obstacles = [acceptButton.getBoundingClientRect(), declineSlot.getBoundingClientRect()];
    const stops = [0, 0.25, 0.5, 0.75, 1];
    const candidates = [];

    for (const x of stops) {
      for (const y of stops) {
        const left = minX + x * (maxX - minX);
        const top = minY + y * (maxY - minY);
        const rect = { left, top, right: left + width, bottom: top + height };
        if (obstacles.some((obstacle) => overlaps(rect, obstacle, 14))) continue;
        if (pointer && overlaps(rect, pointer, 22)) continue;
        const distance = Math.hypot(left - previous.left, top - previous.top);
        candidates.push({ left, top, distance });
      }
    }

    candidates.sort((first, second) => second.distance - first.distance);
    const choices = candidates.slice(0, 4);
    return choices[Math.floor(Math.random() * choices.length)] ?? { left: minX, top: minY };
  }

  function positionDeclineButton(spot) {
    declineButton.style.left = `${spot.left}px`;
    declineButton.style.top = `${spot.top}px`;
  }

  function dodge(event) {
    if (dodgeAnimation || dodges === replies.length) return;
    const previous = declineButton.getBoundingClientRect();
    const pointer = {
      left: event.clientX, right: event.clientX,
      top: event.clientY, bottom: event.clientY,
    };

    if (dodges === 0) {
      // The frosted card creates a containing block for fixed children.
      declineSlot.style.minBlockSize = `${declineSlot.offsetHeight}px`;
      positionDeclineButton(previous);
      Object.assign(declineButton.style, { position: 'fixed', zIndex: '15', margin: '0' });
      document.body.append(declineButton);
    }

    declineButton.textContent = replies[dodges];
    dodges += 1;
    acceptButton.style.setProperty('--accept-scale', Math.min(1 + dodges * 0.055, 1.22));
    const spot = chooseLandingSpot(previous, pointer);
    positionDeclineButton(spot);

    if (!motion.matches && typeof declineButton.animate === 'function') {
      const dx = previous.left - spot.left;
      const dy = previous.top - spot.top;
      dodgeAnimation = declineButton.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
        { duration: 350, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      );
      dodgeAnimation.onfinish = () => { dodgeAnimation = undefined; };
    }
  }

  function cancelDodgeAnimation() {
    dodgeAnimation?.cancel();
    dodgeAnimation = undefined;
  }

  function resetDodge() {
    if (!dodges) return;
    cancelDodgeAnimation();
    declineSlot.append(declineButton);
    for (const property of ['position', 'z-index', 'left', 'top', 'margin']) {
      declineButton.style.removeProperty(property);
    }
    declineSlot.style.removeProperty('min-block-size');
    declineButton.textContent = originalDecline;
    acceptButton.style.removeProperty('--accept-scale');
    dodges = 0;
  }

  function keepDeclineVisible() {
    if (!dodges) return;
    cancelDodgeAnimation();
    const previous = declineButton.getBoundingClientRect();
    const view = viewportBounds();
    const accept = acceptButton.getBoundingClientRect();
    const fits = previous.left >= view.left && previous.top >= view.top &&
      previous.right <= view.right && previous.bottom <= view.bottom;
    if (!fits || overlaps(previous, accept, 12)) {
      positionDeclineButton(chooseLandingSpot(previous));
    }
  }

  function showScreen(screen, title) {
    resetDodge();
    for (const section of [invitation, accepted, declined]) section.hidden = section !== screen;
    if (screen !== accepted) window.scrollTo(0, 0);
    document.getElementById(title).focus({ preventScroll: true });
  }

  let confettiFrame;

  function celebrate() {
    cancelAnimationFrame(confettiFrame);
    if (motion.matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.hidden = false;
    const { width, height } = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    if (!width || !height) {
      canvas.hidden = true;
      return;
    }
    ctx.scale(ratio, ratio);

    const colors = ['#8e4733', '#c87763', '#e7b56f', '#f0d2a8', '#768457', '#a76d56'];
    const particles = Array.from({ length: 90 }, (_, index) => {
      const side = index % 2 === 0 ? 1 : -1;
      return {
        x: side === 1 ? width * 0.13 : width * 0.87,
        y: height * 0.58,
        vx: side * (2 + Math.random() * 8),
        vy: -6 - Math.random() * 11,
        size: 4 + Math.random() * 6,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        color: colors[index % colors.length],
      };
    });
    const started = performance.now();
    let lastFrame = started;

    function paint(now) {
      const elapsed = now - started;
      const step = Math.min((now - lastFrame) / 16.67, 2);
      lastFrame = now;
      ctx.clearRect(0, 0, width, height);
      if (elapsed >= 1550 || accepted.hidden || motion.matches) {
        canvas.hidden = true;
        return;
      }

      for (const piece of particles) {
        piece.x += piece.vx * step;
        piece.y += piece.vy * step;
        piece.vy += 0.28 * step;
        piece.angle += piece.spin * step;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.angle);
        ctx.globalAlpha = Math.min(1, (1550 - elapsed) / 450);
        ctx.fillStyle = piece.color;
        ctx.fillRect(0, 0, piece.size, piece.size * 0.52);
        ctx.restore();
      }
      confettiFrame = requestAnimationFrame(paint);
    }

    confettiFrame = requestAnimationFrame(paint);
  }

  declineButton.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') dodge(event);
  });
  declineButton.addEventListener('click', (event) => {
    if (event.detail === 0 || (dodges === replies.length && !dodgeAnimation)) {
      showScreen(declined, 'declined-title');
    }
    else dodge(event);
  });
  window.addEventListener('resize', keepDeclineVisible);
  window.addEventListener('scroll', keepDeclineVisible, { passive: true });
  window.visualViewport?.addEventListener('resize', keepDeclineVisible);
  window.visualViewport?.addEventListener('scroll', keepDeclineVisible);

  let turning = false;

  acceptButton.addEventListener('click', async () => {
    if (turning) return;

    const canTurn = !motion.matches && typeof invitation.animate === 'function';
    const flat = { transform: 'perspective(70rem) rotateY(0deg)', opacity: 1 };
    let outgoing;

    if (canTurn) {
      turning = true;
      resetDodge();
      invitation.inert = true;
      outgoing = invitation.animate([
        flat,
        { transform: 'perspective(70rem) rotateY(-84deg)', opacity: 0.6 },
      ], { duration: 180, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' });
      await outgoing.finished.catch(() => {});
    }

    showScreen(accepted, 'accepted-title');
    outgoing?.cancel();
    invitation.inert = false;

    if (canTurn && !motion.matches) {
      accepted.animate([
        { transform: 'perspective(70rem) rotateY(84deg)', opacity: 0.6 },
        flat,
      ], { duration: 380, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
    }

    celebrate();
    turning = false;
  });
  document.getElementById('declined-back').addEventListener('click', (event) => {
    event.preventDefault();
    showScreen(invitation, 'invite-title');
  });

  const form = document.getElementById('schedule-form');
  const submitButton = document.getElementById('submit-button');
  const formStatus = document.getElementById('form-status');
  const submitLabel = submitButton.textContent.trim();
  let sending = false;
  let sent = false;

  acceptedBack.addEventListener('click', (event) => {
    event.preventDefault();
    if (!sending) showScreen(invitation, 'invite-title');
  });

  function updateFormStatus(kind, message) {
    formStatus.dataset.state = kind;
    formStatus.textContent = message;
    formStatus.hidden = false;
  }

  form.addEventListener('input', () => {
    if (sending) return;
    sent = false;
    submitButton.disabled = false;
    formStatus.textContent = '';
    delete formStatus.dataset.state;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending || sent || !form.reportValidity()) return;

    const endpoint = form.getAttribute('action')?.trim();
    if (!endpoint || !/^https:\/\/formspree\.io\/f\/[a-z\d]+\/?$/i.test(endpoint)) {
      updateFormStatus('error', 'Form chưa gửi được. Em nhắn anh giờ rảnh nhé.');
      return;
    }

    const values = new FormData(form);
    const request = new AbortController();
    const timeout = window.setTimeout(() => request.abort(), 15000);
    sending = true;
    submitButton.disabled = true;
    acceptedBack.setAttribute('aria-disabled', 'true');
    form.setAttribute('aria-busy', 'true');
    submitButton.textContent = 'Đang gửi…';
    updateFormStatus('pending', 'Đang gửi lịch hẹn.');

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: values,
        signal: request.signal,
      });
      const result = await response.json();
      if (!response.ok || result.ok === false || result.errors?.length) {
        updateFormStatus('error', 'Chưa gửi được. Em thử lại nhé.');
        return;
      }

      const current = new FormData(form);
      sent = [...values].every(([name, value]) => current.get(name) === value);
      updateFormStatus('success', 'Anh nhận được rồi. Gặp em ở Contrast nhé!');
    } catch {
      updateFormStatus('error', 'Chưa gửi được. Em thử lại sau một chút nhé.');
    } finally {
      window.clearTimeout(timeout);
      sending = false;
      form.removeAttribute('aria-busy');
      acceptedBack.removeAttribute('aria-disabled');
      submitButton.disabled = sent;
      submitButton.textContent = submitLabel;
    }
  });
})();
