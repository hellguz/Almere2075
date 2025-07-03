# Prompting Guide - Image-to-Image

<Tip>
  Maximum prompt token is 512 tokens.
</Tip>

*Kontext* makes editing images easy! Specify what you want to change and *Kontext* will follow. It is capable of understanding the context of the image, making it easier to edit them without having to describe in details what you want to do.

## Basic Object Modifications

*Kontext* is really good at straightforward object modification, for example if we want to change the colour of an object, we can prompt it.

<Columns cols={2}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/3ae6ee032b85373b84934574f3ac3bb2fb792d64-2048x1365.jpg" alt="Input image of a yellow car" />
  </Frame>

  <Frame caption="Output: Car changed to red">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/b404ea99e309e5b4bab6fcd82a4a13ad18f2c04b-1248x832.jpg" alt="Output image: Yellow car changed to red" />
  </Frame>
</Columns>

## Prompt Precision: From Basic to Comprehensive

<Tip>
  As a rule of thumb, making things more explicitly never hurts if the number of instructions per edit is not too complicated.
</Tip>

If you want to edit the image with more modifications, it is useful to be more explicit in your prompts to make sure you get the result you want.

### Quick Edits

While using very simple prompts might yield some good results, it can also change the style of the input image.

**Prompt:** *"Change to daytime"*

<Columns cols={3}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/2667b6eeae409799486cda0bddeb8e8ae52dfe0a-843x461.jpg" alt="Input image: Painting of a nighttime street scene" />
  </Frame>

  <Frame caption="Output 1">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/7ffae31e7de2e608f497615a097ae03797c812e8-1392x752.jpg" alt="Output 1: Street scene changed to daytime, style altered" />
  </Frame>

  <Frame caption="Output 2">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/fd05b76128248932ccc91a5c6d603a791d141a1b-1392x752.jpg" alt="Output 2: Street scene changed to daytime, different style alteration" />
  </Frame>
</Columns>

### Controlled Edits

If we add more instructions to our prompt, we can have results which are really similar to the input image.

**Prompt:** *"Change to daytime while maintaining the same style of the painting"*

<Columns cols={2}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/2667b6eeae409799486cda0bddeb8e8ae52dfe0a-843x461.jpg" alt="Input image: Painting of a nighttime street scene" />
  </Frame>

  <Frame caption="Output image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/5e7e898a49db5c24cd6816281bee1bc8fa065a8a-1392x752.jpg" alt="Output image: Street scene changed to daytime, original painting style maintained" />
  </Frame>
</Columns>

### Complex Transformations

If you want to change multiple things on the input image, it is generally good to add as many details as possible as long as the instructions per edit aren't too complicated.

**Prompt:** *"change the setting to a day time, add a lot of people walking the sidewalk while maintaining the same style of the painting"*

<Columns cols={2}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/2667b6eeae409799486cda0bddeb8e8ae52dfe0a-843x461.jpg" alt="Input image: Painting of an empty nighttime street, same as quick_edit_input.jpg" />
  </Frame>

  <Frame caption="Output image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/55d599134f882ce29b47e78be2e13d909688aa57-1392x752.jpg" alt="Output image: Street scene changed to daytime with people, original painting style maintained" />
  </Frame>
</Columns>

## Style transfer

### Using prompts

When working on style transfer prompts, follow those principles:

1. **Name the specific style**: Instead of vague terms like "make it artistic," specify exactly what style you want ("Transform to Bauhaus art style," "Convert to watercolor painting")
2. **Reference known artists or movements**: For more precise results, include recognizable style references ("Renaissance painting style", "like a 1960s pop art poster")
3. **Detail the key characteristics**: If naming the style doesn't work, it might be good to describe the visual elements that define the style:
   * "*Transform to oil painting with visible brushstrokes, thick paint texture, and rich color depth*"
4. **Preserve what matters**: Explicitly state what elements shouldn't change:
   * "Change to Bauhaus art style while maintaining the original composition and object placement"

<Frame caption="Input image">
  <img src="https://cdn.sanity.io/images/gsvmb6gz/production/cea7c2566880221759691bcd3fe32032a6517722-1408x792.jpg" alt="Input image: Symmetrical architectural photo" />
</Frame>

<Columns cols={2}>
  <Frame caption="Converted to pencil sketch">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/b3c1a2881d29f1a24a7dac87a29ea5e1e239215d-1392x752.jpg" alt="Output image: Architectural photo converted to pencil sketch" />
  </Frame>

  <Frame caption="Transformed to oil painting">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/dd190a7f7c52fd80b1e6735dce7e3840f9b0d69a-1392x752.jpg" alt="Output image: Architectural photo transformed into an oil painting" />
  </Frame>
</Columns>

### Using Input image

You can also use input images as style references to generate new images. For example with the prompt: *"Using this style, a bunny, a dog and a cat are having a tea party seated around a small white table"* we get:

<Columns cols={2}>
  <Frame caption="Style reference 1">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/17f65f8e195e01672bbb1fc0876c5dfd8ba2cab5-1686x1166.jpg" alt="Input image for style reference 1: Stylized image" />
  </Frame>

  <Frame caption="Tea party output 1">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/62eb25aa8f24d0f0b7524d052b096c93e4fa6dcc-1248x832.jpg" alt="Output image using style from reference 1: Tea party" />
  </Frame>
</Columns>

<Columns cols={2}>
  <Frame caption="Style reference 2">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/4f8dfc5abd8dcd90ab6684639851fc51636cb5d2-1610x2052.jpg" alt="Input image for style reference 2: Different stylized image" />
  </Frame>

  <Frame caption="Tea party output 2">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/9543fd35e3e04680b564dd57715649b2132d0fd8-880x1184.jpg" alt="Output image using style from reference 2: Tea party" />
  </Frame>
</Columns>

<Columns cols={2}>
  <Frame caption="Style reference 3">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/a18b44009c5cbd4a0d876ea4b4fde372e2d92cb6-843x1118.jpg" alt="Input image for style reference 3: Yet another stylized image" />
  </Frame>

  <Frame caption="Tea party output 3">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/16d6244b1288a42539f089ae2ecea46e5da0315a-880x1184.jpg" alt="Output image using style from reference 3: Tea party" />
  </Frame>
</Columns>

### Transform images into different styles

*Kontext* lets you transform images in creative ways. On the example below, we restyle our photo into different visual styles and also doing different activities.

If your goal is to dramatically change the input image, it is generally a good idea to do it step by step like the sequence below.

<Columns cols={3}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/1d29f5eca1a66a660240aa86743bb78d2cf26f5a-422x750.jpg" alt="Input image: Photo of a person" />
  </Frame>

  <Frame caption="Restyled to Claymation">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/1ae2ab452260efa05467c7c8ff355370f8d8712f-752x1392.jpg" alt="Output image: Person restyled into Claymation style" />
  </Frame>

  <Frame caption="Character picking up weeds">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/a96c5a2ad71f7b38a1d3cb3e279e9deb8278d00b-752x1392.jpg" alt="Output image: Claymation character picking up weeds in a garden" />
  </Frame>
</Columns>

## Iterative editing with Prompts while keeping Character Consistency

*Kontext* excels at character consistency, even after multiple edits. Starting from a reference picture, we can see that the character is consistent throughout the sequence. The prompts used for each edit are shown in the captions below each image.

<Columns cols={2}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/41fcbaa8d77c2c2d5bb49467ae6b5a89572022fa-1125x750.jpg" alt="Input image: Woman" />
  </Frame>

  <Frame caption="Remove the object from her face">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/800f6631c695ff5be4b82ef9cae0981073a0fecd-1248x832.jpg" alt="Output image: Woman taking a selfie in Freiburg" />
  </Frame>
</Columns>

<Columns cols={2}>
  <Frame caption="She is now taking a selfie in the streets of Freiburg, it’s a lovely day out.">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/2090d7d3b1ee0fb83cef25fb94b179163208417b-1248x832.jpg" alt="Output image: Item removed from woman's face" />
  </Frame>

  <Frame caption="It’s now snowing, everything is covered in snow.">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/cc78fef1c0785656280a120647fb313fda6b977a-1248x832.jpg" alt="Output image: Scene with woman now covered in snow" />
  </Frame>
</Columns>

For Character consistency, you can follow this framework to keep the same character across edits:

1. **Establish the reference**: Begin by clearly identifying your character
   * "This person..." or "The woman with short black hair..."
2. **Specify the transformation**: Clearly state what aspects are changing
   * Environment: "...now in a tropical beach setting"
   * Activity: "...now picking up weeds in a garden"
   * Style: "Transform to Claymation style while keeping the same person"
3. **Preserve identity markers**: Explicitly mention what should remain consistent
   * "...while maintaining the same facial features, hairstyle, and expression"
   * "...keeping the same identity and personality"
   * "...preserving their distinctive appearance"

<Warning>
  **Common mistake**: Using vague references like "her" instead of "The woman with short black hair"
</Warning>

## Text Editing

*Kontext* can directly edit text that appears in images, making it easy to update signs, posters, labels, and more without recreating the entire image.

The most effective way to edit text is using quotation marks around the specific text you want to change:

**Prompt Structure**: `Replace '[original text]' with '[new text]'`

**Example -** We can see below where we have an input image with "Choose joy" written, and we replace "joy" with "BFL" - note the upper case format for BFL.

<Columns cols={2}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/1bcbfec679e9456a7ad24c341a987ff90baa29b4-1024x768.jpg" alt="Input image: Sign saying 'Choose joy'" />
  </Frame>

  <Frame caption="JOY replaced with BFL">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/6cc8691da257f2ee6b7b39c5dcf16985d05e6c08-1184x880.jpg" alt="Output image: Sign changed to 'Choose BFL'" />
  </Frame>
</Columns>

<Columns cols={2}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/d6dd70efc9b8135bbf67404ddfc48355d29f81fb-768x1280.jpg" alt="Input image:" />
  </Frame>

  <Frame caption="Sync & Bloom changed to 'FLUX & JOY'">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/4d00e8fc95fa43507e633dd46e692d090c8dcf36-800x1328.jpg" alt="Output image: Text replaced with 'FLUX & JOY'" />
  </Frame>

  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/bb5f1bcc815fdfa574059952044734e0a9b928d4-3824x5032.jpg" alt="Input image: Montreal Winter Sports " />
  </Frame>

  <Frame caption="'Montreal' replaced with 'FLUX'">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/75e9da111513f78ecfdc96bbbe18e635dd575036-880x1184.jpg" alt="Output image: Montreal replaced to 'FLUX'" />
  </Frame>
</Columns>

### Text Editing Best Practices

* **Use clear, readable fonts** when possible. Complex or stylized fonts may be harder to edit
* **Specify preservation** when needed. For example: *"Replace 'joy' with 'BFL' while maintaining the same font style and color"*
* **Keep text length similar** - Dramatically longer or shorter text may affect layout

## Visual Cues

It is also possible to use Visual cues to suggest to the model where to make edits.
This can be particularly helpful when you want to make targeted changes to specific areas of an image.
By providing visual markers or reference points, you can guide the model to focus on particular regions.

**Example:**: *"Add hats in the boxes"*

<Columns cols={2}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/f9465832fe6316eeeb26ba0e1e01af3bcd0e35a2-1000x1500.jpg" alt="Input image:" />
  </Frame>

  <Frame caption="Add hats in the boxes">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/05b55d599423113a716e77a5972a4d441b6b0122-832x1248.jpg" alt="Output image: Add hats in the boxes " />
  </Frame>
</Columns>

## When Results Don't Match Expectations

### General Troubleshooting Tip

If the model is changing elements you want to keep unchanged, be explicit about preservation in your prompt. For example: *"everything else should stay black and white"* or "*maintain all other aspects of the original image*."

### Character identity changes too much

When transforming a person (changing their clothing, style, or context), it's easy to lose their unique identity features if prompts aren't specific enough.

* Try to be more specific about identity markers ("maintain the exact same face, hairstyle, and distinctive features")
* **Example**: *"Transform the man into a viking warrior while preserving his exact facial features, eye color, and facial expression"*

<Frame caption="Input image">
  <img src="https://cdn.sanity.io/images/gsvmb6gz/production/9582b50079c9c2965f12e7581d029f25d216fe73-2048x3072.jpg" alt="Input image: Man" />
</Frame>

<Columns cols={3}>
  <Frame caption="Vague prompt result">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/a52489e750a141ed18089b714ed407f70c3ce3e4-832x1248.jpg" alt="Output image (vague prompt): Man transformed into a Viking, identity changed" />
  </Frame>

  <Frame caption="Detailed prompt result">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/efcead2be7a2dd1a1055a43c3ffa331c3f402c95-832x1248.jpg" alt="Output image (detailed prompt): Man transformed into a Viking, identity preserved" />
  </Frame>

  <Frame caption="Focused prompt result">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/895a30be8db992e7dcbe76adfa5866dccd21d729-832x1248.jpg" alt="Output image (focused prompt): Man's clothes changed to Viking warrior style, identity perfectly preserved" />
  </Frame>
</Columns>

**Vague prompts replace identity:**

* **Prompt:** *"Transform the person into a Viking"* → Complete replacement of facial features, hair, and expression

**Detailed prompts preserve identity:**

* **Prompt:** *"Transform the man into a viking warrior while preserving his exact facial features, eye color, and facial expression"* → Maintains core identity while changing context

**Focused prompts change only what's needed:**

* **Prompt:** *"Change the clothes to be a viking warrior"* → Keeps perfect identity while only modifying the specified element

**Why this happens?**

The verb "transform" without qualifiers often signals to *Kontext* that a complete change is desired. It might be useful to use other words for example in this context if you want to maintain specific aspects of the original image.

### Composition Control

When editing backgrounds or scenes, you often want to keep the subject in exactly the same position, scale, and pose. Simple prompts can sometimes change some of those aspects.

**Simple prompts causing unwanted changes:**

* **Prompt:** *"He's now on a sunny beach"* → Subject position and scale shift
* **Prompt:** *"Put him on a beach"* → Camera angle and framing change

<Frame caption="Input image">
  <img src="https://cdn.sanity.io/images/gsvmb6gz/production/e5eb5377e059d30f39521ebd1c1efb707603fb79-2048x3072.jpg" alt="Input image: Person standing" />
</Frame>

<Columns cols={2}>
  <Frame caption="Simple beach prompt">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/c3b6e9bfa4e899e88e72138de8abd53cfa77845a-832x1248.jpg" alt="Output image (simple prompt 'on a sunny beach'): Subject position and scale shifted" />
  </Frame>

  <Frame caption="Put on beach prompt">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/2c5171f135707b95d54fa64cfc314b48f65eb22d-832x1248.jpg" alt="Output image (simple prompt 'put him on a beach'): Camera angle and framing changed" />
  </Frame>
</Columns>

**Precise prompts maintain exact positioning:**

* **Prompt:** *"Change the background to a beach while keeping the person in the exact same position, scale, and pose. Maintain identical subject placement, camera angle, framing, and perspective. Only replace the environment around them"* → Better preservation of subject

<Columns cols={2}>
  <Frame caption="Input image">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/e5eb5377e059d30f39521ebd1c1efb707603fb79-2048x3072.jpg" alt="Input image: Person standing (for precise background change)" />
  </Frame>

  <Frame caption="Precise positioning result">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/99a68b57d0e08427fa96621f1ede6490f84cfd57-832x1248.jpg" alt="Output image (precise prompt): Background changed to beach, subject position preserved" />
  </Frame>
</Columns>

**Why this happens?**

Vague instructions like *"put him on a beach"* leave too much to interpretation. *Kontext* might choose to:

* Adjust the framing to match typical beach photos
* Change the camera angle to show more of the beach
* Reposition the subject to better fit the new setting

### Style isn't applying correctly

When applying certain styles, simple prompts might create inconsistent results or lose important elements of the original composition. We could see that in the [example above](#using-prompts).

**Basic style prompts can lose important elements:**

* **Prompt:** *"Make it a sketch"* → While the artistic style is applied, some details are lost.

**Precise style prompts maintain structure:**

* **Prompt:** *"Convert to pencil sketch with natural graphite lines, cross-hatching, and visible paper texture"* → Preserves the scene while applying the style. You can see more details in the background, more cars are also appearing on the image.

<Frame caption="Input image">
  <img src="https://cdn.sanity.io/images/gsvmb6gz/production/bc3c5e495502dd23fd06d58c3a669d4328808910-1392x752.jpg" alt="Input image: Street scene photo" />
</Frame>

<Columns cols={2}>
  <Frame caption="Basic sketch prompt">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/9dd39c8f2dc8335b64c1772c2eb8e6b7359b3999-1392x752.jpg" alt="Output image (basic sketch prompt): Street scene as sketch, some details lost" />
  </Frame>

  <Frame caption="Precise sketch prompt">
    <img src="https://cdn.sanity.io/images/gsvmb6gz/production/3c3bb1f4d1d05fa6b716e2f6d7e1d177dbf01d88-1392x752.jpg" alt="Output image (precise sketch prompt): Street scene as detailed pencil sketch" />
  </Frame>
</Columns>

## Best Practices Summary

* **Be specific**: Precise language gives better results. Use exact color names, detailed descriptions, and clear action verbs instead of vague terms.
* **Start simple**: Begin with core changes before adding complexity. Test basic edits first, then build upon successful results. Kontext can handle very well iterative editing, use it.
* **Preserve intentionally**: Explicitly state what should remain unchanged. Use phrases like *"while maintaining the same \[facial features/composition/lighting]"* to protect important elements.
* **Iterate when needed**: Complex transformations often require multiple steps. Break dramatic changes into sequential edits for better control.
* **Name subjects directly**: Use "the woman with short black hair" or "the red car" instead of pronouns like "her", "it," or "this" for clearer results.
* **Use quotation marks for text**: Quote the exact text you want to change: `Replace 'joy' with 'BFL'` works better than general text descriptions.
* **Control composition explicitly**: When changing backgrounds or settings, specify *"keep the exact camera angle, position, and framing"* to prevent unwanted repositioning.
* **Choose verbs carefully**: *"Transform"* might imply complete change, while *"change the clothes"* or *"replace the background"* gives you more control over what actually changes.

<Tip>
  **Remember**: Making things more explicit never hurts if the number of instructions per edit isn't too complicated.
</Tip>
