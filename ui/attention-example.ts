import type { Archive } from './types';

// Editorial fiction, separate from the Luna bus story and ICLR 2027 submissions.
export const attentionExample: Archive = {
  id: 'attention', title: 'Attention Is All You Need', createdAt: '', example: true, sourceYear: 2017,
  story: {
    format: 'encyclopedia',
    headline: 'Attention Was All You Needed',
    deck: 'Once the engine of the AI revolution, attention is now a museum exhibit. The machines have moved on. The history books have not.',
    sections: [
      { heading: 'A technology with a gift shop', text: 'Attention was an early artificial-intelligence technology, now best known through school trips to the Museum of Machine Intelligence. Its largest surviving installation occupies three floors. Visitors press a button, wait eleven seconds and watch it finish the sentence “The cat sat on the”. Children are usually disappointed. Their pocket companions have already imagined the cat knocking over the exhibit, caught it and booked a replacement vase. The old machine’s cooling system still heats the museum café. A sign above the radiator reads: THIS ONCE CHANGED THE WORLD.' },
      { heading: 'When reading stopped being enough', text: 'The 2017 paper Attention Is All You Need gave an era its name. For decades, machines built around attention wrote code, answered questions and helped people invent their successors. Then the job changed. AI was expected to repair homes, run cities and make decisions whose consequences would arrive years later. Knowing what people had said about the world was no longer enough. The new machines learned by trying things inside small imagined worlds: dropping a cup, missing a train, moving a hospital entrance and watching who could no longer reach it. By the 2050s, the leading systems had replaced attention with a different way of learning from those experiences. The phrase “all you need” became the most affectionately quoted sentence in computing history.' },
      { heading: 'The successor had its own problem', text: 'For a while, people assumed a machine that had rehearsed a million futures could handle the real one. Then a household robot confidently carried a vase through a room it had imagined ten million times. It had never imagined the cat. The vase survived; the robot’s reputation did not. The next breakthrough was teaching machines to notice what their imagined worlds were missing. Today, an AI can ask for five minutes to try a decision in a place it does not understand, rather than pretend its rehearsals cover everything. Older engineers complain that machines used to answer immediately. Museum guides agree: they were wonderfully confident. Every new architecture still begins its history lesson with Attention Is All You Need. Becoming obsolete, the entry concludes, is sometimes evidence that a technology helped create a world large enough to outgrow it.' }
    ],
    quote: 'Attention was all you needed. Then we started asking the machines to do things.',
    timeline: [
      { year: 2017, event: 'Attention Is All You Need becomes the opening chapter of an imagined century of machine intelligence.' },
      { year: 2054, event: 'AI built around imagined experiences overtakes the old attention-based systems. “All you need” becomes a historical expression.' },
      { year: 2077, event: 'The last large attention installation reopens as a museum exhibit. Its cooling system heats the café.' }
    ]
  }
};
