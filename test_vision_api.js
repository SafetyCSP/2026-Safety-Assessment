
async function testVision() {
    try {
        console.log("Testing Vision API...");
        // Valid 1x1 PNG (transparent)
        const whitePixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

        const response = await fetch('http://localhost:3000/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: whitePixel,
                context: "OSHA Standard 1910.22: Walking-Working Surfaces. Check for trip hazards."
            })
        });

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("Error:", error);
    }
}

testVision();
