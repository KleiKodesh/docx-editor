<template>
  <div class="app">
    <h1>DOCX Editor - Vue</h1>
    <p>Edit source code in packages/core/ and packages/vue/</p>
    <div class="source-info">
      <h2>Source Structure:</h2>
      <ul>
        <li><strong>packages/core/src/</strong> - DOCX parsing and serialization logic</li>
        <li><strong>packages/vue/src/</strong> - Vue components and wrappers</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
// Development environment for editing the DOCX editor source code
</script>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

h1 {
  color: #333;
  margin-bottom: 10px;
}

h2 {
  font-size: 1.2em;
  margin: 20px 0 10px;
}

.source-info {
  background: #f5f5f5;
  border-left: 4px solid #667eea;
  padding: 20px;
  margin-top: 30px;
  border-radius: 4px;
}

ul {
  list-style: none;
  padding: 0;
}

li {
  margin: 10px 0;
  padding: 8px;
  background: white;
  border-radius: 3px;
}
</style>
