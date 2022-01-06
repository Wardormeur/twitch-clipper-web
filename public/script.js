let token;
        let pagination;
        let clips = [];
        const ffmpeg = FFmpeg.createFFmpeg({ log: false });

        window.onbeforeunload = function () {
            if (ffmpeg) ffmpeg.exit()
        };

        (async () => {
            [key, token] = getToken()
            if (token) {
                hideConnect()
                showMore()
            }
        })()

            function hideConnect() {
                document.querySelector('#connect').style.display = 'none';
            }

            async function showMore() {
                let res = await getClips()
                let _clips = prepareClips(res.data)
                pagination = res.pagination
                generateThumbs(_clips)
                clips = clips.concat(_clips);
            }

            function getToken() {
                const loc = new URL(document.location);
                let params = loc.hash.replace('#', '').split('&');
                params = params.map((string) => string.split('='));
                return params.find((p) => p[0] == 'access_token');
            }

            function prepareClips(clips) {
                clips = clips.map((c => {
                    let splits = c.thumbnail_url.split('/');
                    let id = splits[splits.length-1];
                    c.numId = id.split('-preview')[0];
                    c.src = `/proxy/${c.numId}.mp4`
                    c.proxied_thumbnail_url = `/proxy/${c.numId}.jpg`
                    return c;
                }))
                clips.sort((c1, c2) => new Date(c1.created_at) <= new Date(c2.created_at))
                return clips
            }

            function generateThumbs(clips) {
                let thumbs = document.querySelector('#thumbs')
                clips.forEach((c => {
                    video = document.createElement('video')
                    video.src = c.src
                    video.type= "video/mp4"
                    video.controls = true
                    video.height = 250
                    video.preload = "auto"
                    video.poster = c.proxied_thumbnail_url
                    thumbs.appendChild(video)
                }))
            }
            async function getClips() {
                const params = {
                    broadcaster_id: 55434616,
                    first: 10
                };
                if (pagination) params.after = pagination.cursor;
                const res = await axios.get(
                    `https://api.twitch.tv/helix/clips`,
                    {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Client-ID': 'lykfmi4xw0vec3utrdqvhdimkmz0ci',
                    },
                    params,
                });
                return res.data;
            }
            async function concat() {
                
                await ffmpeg.load();

                let command = []
                let sources = []
                let concatened = ''
                let scaled = []
                let duration = 0
                const fps = 30
                const resolution = '320:180'; // '1920:1080'
                ffmpeg.FS('writeFile', 'font.woff2', await FFmpeg.fetchFile('https://fonts.gstatic.com/s/opensans/v27/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVI.woff2'))
                // await ffmpeg.run('-i', 'test.mp4', '-vf', "drawtext=fontfile=/font.woff2:text='Stack Overflow':fontcolor=white:fontsize=24:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=(h-text_h)/2", '-codec:a', 'copy', 'out.mp4');
                const progress = document.querySelector('#progress')
                const progressbar = document.querySelector('#progressbar')
                const estimation = document.querySelector('#estimation')
                progressbar.classList.toggle('hidden')
                estimation.classList.toggle('hidden')
                // clips = clips.slice(0, 2)
                console.time('Metric');
                ffmpeg.setProgress(({ ratio, time }) => {
                    let status = parseInt(time/duration * 100)                    
                    if (status< 50) {
                        state = `${status}% Resizing`
                    }
                    else if(status > 50) {
                        state = `${status}% Concatenating`
                    } else {
                        state = `Done !`
                    }
                    if (status) progress.style.width = `${status}%`;
                    estimation.textContent = state;
                });
                for(const [i, c] of clips.entries()) { 
                    console.log('handling file', i)
                    file = await FFmpeg.fetchFile(c.src)
                    state = `Loading file ${i}`
                    estimation.textContent = state;
                    await ffmpeg.FS('writeFile', `source${i}.mp4`, file);

                    sources.push('-i')
                    sources.push(`source${i}.mp4`)
                    scaled.push(`[${i}:v]scale=${resolution},setsar=sar=1,fps=${fps}[scaledv${i}]`) 

                    duration += c.duration
                    concatened += `[scaledv${i}] [${i}:a] `
                }
                
                concatened += `concat=n=${clips.length}:v=1:a=1 [v] [a]`
                command.push(...sources, '-filter_complex', `${scaled.join(';')};${concatened}`, '-map' ,'[v]' ,'-map', '[a]', 'out.mp4')
                console.log(command)
                await ffmpeg.run(...command)

                console.timeEnd('Metric');

                const vid = document.querySelector('#video')
                let blob = await ffmpeg.FS('readFile', 'out.mp4')
                blob = new Blob([blob.buffer], { type:'video/mp4' })
                vid.src = window.URL.createObjectURL(blob);
                vid.height = 250
                video.type= "video/mp4"
                video.controls = true
                video.poster = clips[0].thumbnail_url
                document.querySelector('#video').classList.toggle('hidden')
                ffmpeg.exit()
            }