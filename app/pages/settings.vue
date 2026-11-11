<template>
  <div class="page page-container settings-page">
    <section class="page-intro">
      <p class="eyebrow">The quiet machinery / 03</p>
      <h1>Settings</h1>
      <p class="page-intro-copy">A small amount of information about how this archive is kept.</p>
    </section>
    <div class="settings-list">
      <section class="setting-row"><div><span class="fact-label">Archive status</span><h2>Sample data active</h2><p>This preview is powered by local fixture entries. No personal files are stored in this application.</p></div><span class="status-dot">Preview</span></section>
      <section class="setting-row"><div><span class="fact-label">Archive directory</span><h2 class="setting-value">Not configured</h2><p>The filesystem adapter will point to a separate Life Archive data repository on this computer.</p></div><button class="button button--small" disabled>Configure later</button></section>
      <section class="setting-row"><div><span class="fact-label">Storage</span><h2>Markdown + media</h2><p>Markdown files remain the source of truth. Images and videos stay beside the entry that references them.</p></div><span class="setting-symbol">.md</span></section>
    </div>
    <aside class="settings-note"><span class="end-mark" aria-hidden="true">✳</span><div><strong>Designed for a private archive.</strong><p>This first version has no account, sync, database or cloud connection. It is intentionally simple.</p></div></aside>
  </div>
</template>
