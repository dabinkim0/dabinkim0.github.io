        document.addEventListener('DOMContentLoaded', () => {
            const audioNodes = Array.from(document.querySelectorAll('.demo-section audio'));

            audioNodes.forEach((audio, index) => {
                const sourceNode = audio.querySelector('source');
                const audioPath = sourceNode ? sourceNode.getAttribute('src') : null;
                if (!audioPath || !audioPath.endsWith('.wav')) {
                    return;
                }

                const imagePath = audioPath
                    .replace(/^audio\//, 'spectrograms/')
                    .replace(/\.wav$/i, '.png');

                const img = document.createElement('img');
                img.className = 'spectrogram-preview';
                img.src = imagePath;
                img.alt = `Spectrogram preview ${index + 1}`;
                img.loading = 'lazy';
                audio.insertAdjacentElement('afterend', img);
            });
        });
