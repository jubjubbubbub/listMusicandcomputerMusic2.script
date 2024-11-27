/** @param {NS} ns **/
export async function main(ns) {
  // Define all necessary functions within the script
  const formatPathFile = (path) => path ? path.replace(/\\/g, '/') : '';
  const shuffle = (array) => array.sort(() => Math.random() - 0.5);
  const getInput = () => ''; // Replace with actual implementation if needed
  const setInput = (message) => ns.toast(message, 'info', 3000);
  const bar = (value, length) => '='.repeat(Math.floor(value * length));
  const graphBar = (maxHeight, dataArray, max) => ''; // Replace with actual implementation if needed
  const concatGraphs = (graph1, graph2, separator) => graph1.split('\n').map((line, idx) => line + separator + (graph2.split('\n')[idx] || '')).join('\n');

  ns.disableLog('sleep');
  ns.disableLog('ui.clearTerminal');
  ns.tail();

  let textNext = "next", textBack = "back", textPause = "pause", textPlay = "play", textStop = "stop";
  if (ns.args[0] === "config") {
    // Configuration code here
  } else if (ns.args[0]) {
    await ns.wget(formatPathFile(ns.args[0]), "Music.txt");
  }

  let path = "", name = "";
  let file = ns.read("Music.txt");
  let listMusic = file.split('\r\n').map(song => {
    song = song.slice(1, song.length - 1);
    if (song.endsWith(".mp3") || song.endsWith(".MP3") || song.endsWith(".wav") || song.endsWith(".ogg")) {
      path = formatPathFile(song);
      name = path.slice(path.lastIndexOf("/") + 1, path.lastIndexOf("."));
      return [path, name];
    }
    return null;
  }).filter(song => song !== null);

  listMusic = shuffle(listMusic);
  let context = new AudioContext();

  // List all files in the specified directory
  const specifiedPath = ns.args[0];
  if (!specifiedPath) {
    ns.tprint("Please provide a path as an argument.");
    return;
  }

  const fileTypeExtensions = [".wav", ".ogg", ".mp3"];
  let fileList = [];

  const files = ns.ls("home", specifiedPath);
  for (const file of files) {
    for (const ext of fileTypeExtensions) {
      if (file.endsWith(ext)) {
        fileList.push(file);
        break;
      }
    }
  }

  const fileName = "listMusicBitburner.txt";
  await ns.write(fileName, fileList.join("\n"), "w");
  ns.tprint(`List created: ${fileName}`);

  // Removed the while loop and index loop
  if (listMusic.length > 0) {
    let volume = 1, next = false, back = false, pause = false, song, lastSong, min, seg, duration, count, wait = 0;
    let nextSong = new Audio(listMusic[0][0]);

    count = 0, wait = 0, next = false, pause = false;
    song = nextSong;

    if (listMusic.length > 1) {
      nextSong = new Audio(listMusic[1][0]);
    } else {
      nextSong = null;
    }

    song.play();
    let audioSource = context.createMediaElementSource(song);
    let analyser = context.createAnalyser();
    audioSource.connect(analyser);
    analyser.connect(context.destination);
    analyser.fftSize = 256;
    let bufferLength = analyser.frequencyBinCount - 20;
    let dataArray = new Uint8Array(bufferLength);

    do {
      min = Math.floor(song.duration / 60);
      seg = Math.floor(song.duration - 60 * min);
      if (seg < 10)
        seg = "0" + seg;
      duration = " " + min + ":" + seg;
      await ns.sleep(0);
      if (wait < 1) {
        wait++;
        ns.print("      Loading...");
      }
    } while (duration === " NaN:NaN");

    min = 0, seg = -1;
    ns.toast("Playing " + listMusic[0][1], "info", 10000);

    if (!song.ended) {
      count++;
      switch (getInput().toString().toLowerCase()) {
        case "-":
          volume = Math.max(volume - 0.05, 0);
          setInput(volume > 0 ? "" : "Volume at min");
          break;
        case "+":
          volume = Math.min(volume + 0.05, 1);
          setInput(volume < 1 ? "" : "Volume at max");
          break;
        case "next":
          if (nextSong !== null && count > 25) next = true;
          break;
        case "back":
          if (lastSong !== null && count > 25) back = true;
          break;
        case "pause":
          if (!pause) {
            song.pause();
            pause = true;
          }
          break;
        case "play":
          if (pause) {
            song.play();
            pause = false;
          }
          break;
        case "stop":
          song.pause();
          song.currentTime = 0;
          pause = true;
          break;
      }
      if (next || back) {
        song.pause();
        song.currentTime = 0;
      }
      if (!song.paused) {
        try {
          song.volume = volume;
        } catch { }
        min = Math.floor(song.currentTime / 60);
        seg = Math.floor(song.currentTime - 60 * min);
        if (seg < 10) seg = "0" + seg;
        let output = `\n ${min}:${seg} `;

        output = output.padEnd(bufferLength + 1 - duration.length, '_') + `${duration}│ `;
        output += `\n ${bar(song.currentTime / song.duration, bufferLength - 1)}│> ${listMusic[0][1]}\n`;

        let visual = visualizer(analyser, bufferLength, dataArray);
        let listString = "";
        for (let j = 0; j < 31; j++) {
          if (j < listMusic.length)
            listString += listMusic[j][1];
          listString += '\n';
        }
        output += concatGraphs(visual[0], listString, "| ");
        ns.print(volume);
      }
    }
  }
}
