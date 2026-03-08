/**
 * Secret Mode Detector
 * Detects secret gestures and keyboard patterns to toggle fake/real mode
 * 
 * Mobile: Swipe right 4 times, then left 2 times
 * Desktop: Type "zeus" then press Enter twice
 */

class SecretModeDetector {
    private swipeCount = { right: 0, left: 0 };
    private keySequence: string[] = [];
    private enterPressCount = 0;
    private lastSwipeTime = 0;
    private lastKeyTime = 0;
    private readonly SWIPE_TIMEOUT = 3000; // 3 seconds
    private readonly KEY_TIMEOUT = 2000; // 2 seconds
    private readonly TARGET_SEQUENCE = 'zeus';
    private touchStartX = 0;
    private touchStartY = 0;

    constructor() {
        this.init();
    }

    private init() {
        // Mobile touch events
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });

        // Desktop keyboard events
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    private handleTouchStart(e: TouchEvent) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    private handleTouchEnd(e: TouchEvent) {
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;
        
        // Check if it's a horizontal swipe (not vertical)
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            const currentTime = Date.now();
            
            // Reset if timeout exceeded
            if (currentTime - this.lastSwipeTime > this.SWIPE_TIMEOUT) {
                this.resetSwipes();
            }
            
            this.lastSwipeTime = currentTime;
            
            if (deltaX > 0) {
                // Swipe right
                this.handleSwipeRight();
            } else {
                // Swipe left
                this.handleSwipeLeft();
            }
        }
    }

    private handleSwipeRight() {
        // Only count right swipes if we haven't started left swipes yet
        if (this.swipeCount.left === 0) {
            this.swipeCount.right++;
            console.log(`👉 Swipe right: ${this.swipeCount.right}/4`);
            
            if (this.swipeCount.right === 4) {
                console.log('✅ Right swipes complete! Now swipe left 2 times...');
            }
        } else {
            // Reset if swiping right after starting left swipes
            console.log('❌ Wrong direction! Resetting...');
            this.resetSwipes();
        }
    }

    private handleSwipeLeft() {
        // Only count left swipes if we've completed 4 right swipes
        if (this.swipeCount.right === 4) {
            this.swipeCount.left++;
            console.log(`👈 Swipe left: ${this.swipeCount.left}/2`);
            
            if (this.swipeCount.left === 2) {
                console.log('🎉 Secret gesture detected!');
                this.activateFakeRealMode();
                this.resetSwipes();
            }
        } else {
            // Reset if swiping left before completing right swipes
            console.log('❌ Complete right swipes first! Resetting...');
            this.resetSwipes();
        }
    }

    private resetSwipes() {
        this.swipeCount = { right: 0, left: 0 };
    }

    private handleKeyDown(e: KeyboardEvent) {
        const currentTime = Date.now();
        
        // Reset if timeout exceeded
        if (currentTime - this.lastKeyTime > this.KEY_TIMEOUT) {
            this.keySequence = [];
            this.enterPressCount = 0;
        }
        
        this.lastKeyTime = currentTime;
        
        if (e.key === 'Enter') {
            // Check if we've typed the correct sequence
            const typedSequence = this.keySequence.join('').toLowerCase();
            
            if (typedSequence === this.TARGET_SEQUENCE) {
                this.enterPressCount++;
                console.log(`⏎ Enter pressed: ${this.enterPressCount}/2`);
                
                if (this.enterPressCount === 2) {
                    console.log('🎉 Secret keyboard sequence detected!');
                    this.activateFakeRealMode();
                    this.keySequence = [];
                    this.enterPressCount = 0;
                }
            } else {
                // Wrong sequence, reset
                this.keySequence = [];
                this.enterPressCount = 0;
            }
        } else if (e.key.length === 1 && /[a-z]/i.test(e.key)) {
            // Only add letter keys
            this.keySequence.push(e.key.toLowerCase());
            
            // Keep only the last 4 characters (length of "zeus")
            if (this.keySequence.length > this.TARGET_SEQUENCE.length) {
                this.keySequence.shift();
            }
            
            const currentSequence = this.keySequence.join('');
            if (currentSequence === this.TARGET_SEQUENCE) {
                console.log('✅ Sequence "zeus" typed! Press Enter twice...');
            }
        }
    }

    private activateFakeRealMode() {
        const currentMode = localStorage.getItem('demo_icon_us_flag') === 'true';
        
        if (!currentMode) {
            // Enable fake real mode
            localStorage.setItem('demo_icon_us_flag', 'true');
            localStorage.setItem('fake_real_mode_acknowledged', 'true');
            console.log('✅ Fake Real Mode ENABLED');
            
            // Update URL parameter if on demo account
            const activeLoginId = localStorage.getItem('active_loginid');
            if (activeLoginId && activeLoginId.startsWith('VR')) {
                const searchParams = new URLSearchParams(window.location.search);
                searchParams.set('account', 'USD');
                window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
            }
            
            // Reload to apply changes
            window.location.reload();
        } else {
            // Disable fake real mode
            localStorage.setItem('demo_icon_us_flag', 'false');
            console.log('✅ Fake Real Mode DISABLED');
            
            // Update URL parameter back to demo if on demo account
            const activeLoginId = localStorage.getItem('active_loginid');
            if (activeLoginId && activeLoginId.startsWith('VR')) {
                const searchParams = new URLSearchParams(window.location.search);
                searchParams.set('account', 'demo');
                window.history.pushState({}, '', `${window.location.pathname}?${searchParams.toString()}`);
            }
            
            // Reload to apply changes
            window.location.reload();
        }
    }

    public destroy() {
        document.removeEventListener('touchstart', this.handleTouchStart.bind(this));
        document.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    }
}

// Initialize the detector
let detectorInstance: SecretModeDetector | null = null;

export const initSecretModeDetector = () => {
    if (!detectorInstance) {
        detectorInstance = new SecretModeDetector();
        console.log('🔐 Secret Mode Detector initialized');
    }
    return detectorInstance;
};

export const destroySecretModeDetector = () => {
    if (detectorInstance) {
        detectorInstance.destroy();
        detectorInstance = null;
        console.log('🔐 Secret Mode Detector destroyed');
    }
};
