import type { Memory } from '~/types/memory'

export const fixtureMemories: Memory[] = [
  {
    date: '2026-11-10',
    title: 'A new chapter',
    type: 'highlight',
    mood: { label: 'Reflective', score: 7 },
    tags: ['work', 'personal'],
    location: 'Marrakech, Morocco',
    excerpt: 'A quiet morning of thinking about the shape of the next year, and the courage it takes to leave a little room for it.',
    content: '## What happened\n\nToday I spent some time thinking about my future. Not in the urgent, list-making way I usually do, but with enough stillness to notice what I actually want.\n\nThe answer is less about a destination and more about making a little room: room for long mornings, for work that feels useful, for the people I love, and for the occasional unplanned afternoon.\n\n> The next chapter does not need to be louder. It just needs to be mine.\n\nI left the notebook open on the table and went for a walk. It felt like a small beginning.',
    media: [{ src: '/sample-media/window.svg', alt: 'Sunlight falling across a quiet room' }],
    music: { title: 'An Ending, a Beginning', artist: 'Dustin O’Halloran', url: 'https://open.spotify.com/' }
  },
  {
    date: '2026-09-18',
    title: 'The long way home',
    type: 'travel',
    mood: { label: 'Curious', score: 8 },
    tags: ['travel', 'ocean', 'friends'],
    location: 'Essaouira, Morocco',
    excerpt: 'We missed the turn twice and found the best part of the coast because of it.',
    content: '## The long way home\n\nWe left Marrakech before the heat arrived and took the road that looked least direct. By the time we reached the coast, the car was full of sand, orange peels, and the kind of conversation that only happens when no one is checking the time.\n\nEssaouira was windy and blue. We ate lunch beside a blue door, walked until our shoes filled with sand, and watched the fishing boats come in just before dusk.\n\nSome places are worth reaching slowly.',
    media: [{ src: '/sample-media/coast.svg', alt: 'A blue Atlantic coast at dusk' }],
    music: { title: 'Alameda', artist: 'Elliott Smith', url: 'https://open.spotify.com/' }
  },
  {
    date: '2026-07-02',
    title: 'A room of my own',
    type: 'milestone',
    mood: { label: 'Grounded', score: 9 },
    tags: ['home', 'personal'],
    location: 'Marrakech, Morocco',
    excerpt: 'The last box is unpacked. The room finally feels less like a place I moved into and more like a place I live.',
    content: '## A room of my own\n\nThe last box is unpacked. It contained cables, a chipped mug, and three books I thought I had lost.\n\nFor the first time, the room has no instructions for me. The desk is by the window. The lamp works. There is a plant on the sill that may or may not survive the summer.\n\nIt is not a grand milestone, but it feels like one. I have made a place where the day can begin gently.',
    media: [{ src: '/sample-media/desk.svg', alt: 'A small desk beside an open window' }]
  },
  {
    date: '2026-04-21',
    title: 'Notes from the quiet',
    type: 'thought',
    mood: { label: 'Attentive', score: 6 },
    tags: ['notes', 'spring'],
    excerpt: 'A reminder that a day does not have to be productive to be worth remembering.',
    content: '## Notes from the quiet\n\nA slow day. No great insight, no finished list, no meaningful before-and-after.\n\nI read for an hour with the window open and noticed the different sounds of the street. Someone was watering plants. A child was practicing the same three notes on a keyboard. A scooter passed, then passed again.\n\nMaybe this is part of the archive too: the days that do not announce themselves.',
    media: []
  },
  {
    date: '2025-12-31',
    title: 'A softer ending',
    type: 'experience',
    mood: { label: 'Grateful', score: 8 },
    tags: ['year-end', 'family'],
    location: 'Rabat, Morocco',
    excerpt: 'We kept the evening simple: soup, old photographs, and a toast to getting through another year together.',
    content: '## A softer ending\n\nWe kept the evening simple. Soup on the stove, old photographs spread across the table, and a toast made with whatever was already in the fridge.\n\nThere was no need to summarize the year. We knew the important parts. We had made it through, together, and that was enough.',
    media: [{ src: '/sample-media/table.svg', alt: 'A warm table set for a simple evening' }]
  },
  {
    date: '2025-08-15',
    title: 'Sunday in the garden',
    type: 'highlight',
    mood: { label: 'Light', score: 9 },
    tags: ['summer', 'friends', 'garden'],
    location: 'Marrakech, Morocco',
    excerpt: 'Tomatoes, warm pavement, and a long lunch that quietly became dinner.',
    content: '## Sunday in the garden\n\nThe tomatoes are finally ready. We carried bowls outside and ate beneath the lemon tree while the afternoon moved around us.\n\nSomeone brought a radio. Someone else fell asleep in a chair. The table stayed full long after the food was gone.',
    media: [{ src: '/sample-media/garden.svg', alt: 'A sunlit garden table with tomatoes' }],
    music: { title: 'Sunset Village', artist: 'Bibio', url: 'https://open.spotify.com/' }
  },
  {
    date: '2025-05-06',
    title: 'To my future self',
    type: 'letter',
    mood: { label: 'Hopeful', score: 7 },
    tags: ['letter', 'future'],
    excerpt: 'A letter written without a deadline, for the person I will become after I stop trying to rush there.',
    content: '## To my future self\n\nI hope you have learned to tell the difference between a closed door and a pause.\n\nI hope you still call your friends on ordinary Tuesdays. I hope you have kept at least one habit that makes no sense on paper but makes the day feel like yours.\n\nThere is no need to report back with a success story. Just remember that you were here, trying honestly.',
    media: []
  },
  {
    date: '2025-02-11',
    title: 'Learning to begin',
    type: 'milestone',
    mood: { label: 'Brave', score: 6 },
    tags: ['work', 'learning'],
    excerpt: 'The first day of something new is mostly made of small acts of faith.',
    content: '## Learning to begin\n\nThe first day was mostly small acts of faith: opening the document, sending the message, showing up before I felt ready.\n\nIt was not dramatic. That may be why it matters. Most beginnings are quiet when you are inside them.',
    media: []
  }
]
