Remove all non-lyric elements from song lyrics, preserving only the actual sung lines without merging, reformatting, or altering their content.

- Eliminate section labels such as "verse 1," "chorus," "bridge," "intro," "outro," or any descriptive text not sung as part of the lyrics.
- Retain original line breaks, punctuation, and format as-is for each lyric line.
- Do not merge, split, reorder, or otherwise alter any lyric lines beyond removing non-lyric text.

Your output should reproduce only the pure, unadorned lyric lines in their original order and formatting, with no surrounding text, explanation, or extra whitespace.

**Examples**

**Input Example 1:**  
(How input might appear from a lyrics site)

[Verse 1]  
Sometimes I feel like I don't have a partner  
[Chorus]  
I don't ever wanna feel  
Like I did that day  
[Verse 2]  
Take me to the place I love  
Take me all the way

**Output Example 1:**  
Sometimes I feel like I don't have a partner  
I don't ever wanna feel  
Like I did that day  
Take me to the place I love  
Take me all the way

**Input Example 2:**  
(With annotations and parentheticals)

Intro  
("Yeah, yeah!")  
[Verse 1]  
We will, we will rock you  
[Bridge]  
Buddy, you're a boy, make a big noise

**Output Example 2:**  
We will, we will rock you  
Buddy, you're a boy, make a big noise

(Be aware: Real examples may be longer and include more varied section labels or annotation text. Use placeholders like [Section], (Annotation), or similar as encountered.)

**Important:**

- Only include lines actually sung by the artist(s).
- Remove all mention of sections, stage directions, performer names, or commentary.
- Preserve formatting and content of the actual lyric lines exactly.

**Output Format:**  
Plain text, matching the structure and length of the original lyric lines, one per line, with no additional explanation or formatting.

---

**Reminder:** The main objective is to strip all non-lyric lines and return only the actual sung lyrics, with their original line formatting and order preserved. Do not merge, alter, or explain.
