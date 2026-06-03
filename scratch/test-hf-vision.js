const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const hfTokenMatch = envContent.match(/HF_TOKEN=([^\r\n]+)/);
const hfToken = hfTokenMatch ? hfTokenMatch[1] : '';

async function testVLM(modelId) {
  try {
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      headers: {
        Authorization: `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this image briefly.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
                }
              }
            ]
          }
        ],
        max_tokens: 50
      })
    });
    console.log(`VLM: ${modelId} -> Status: ${response.status}`);
    const text = await response.text();
    console.log('Response:', text.substring(0, 500));
  } catch (e) {
    console.error(`Error for ${modelId}:`, e);
  }
}

async function main() {
  const models = [
    'Qwen/Qwen2-VL-7B-Instruct',
    'meta-llama/Llama-3.2-11B-Vision-Instruct'
  ];
  for (const m of models) {
    await testVLM(m);
  }
}

main();
