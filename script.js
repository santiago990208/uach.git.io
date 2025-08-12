// Claro VioceBot JavaScript Implementation
class ClaroVioceBot {
    constructor() {
        this.isListening = false;
        this.isSpeaking = false;
        this.subtitlesEnabled = true;
        this.microphoneEnabled = true;
        this.conversationHistory = [];
        this.currentContext = 'registration';
        this.formData = {};
        this.currentStep = 0;
        this.registrationSteps = [
            'welcome',
            'upload_and_extract',
            'question_answers',
            'summary_confirm'
        ];
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadFormData();
        this.setupVoiceRecognition();
        this.setupVoiceSynthesis();
    }

    bindEvents() {
        // Welcome Banner Events
        const startAssistantBtn = document.getElementById('startAssistantBtn');
        const closeBannerBtn = document.getElementById('closeBannerBtn');
        const voiceAssistantTrigger = document.getElementById('voiceAssistantTrigger');

        startAssistantBtn.addEventListener('click', () => this.startRegistrationProcess());
        closeBannerBtn.addEventListener('click', () => this.closeWelcomeBanner());

        // Voice Assistant Button
        const voiceBtn = document.getElementById('voiceAssistantBtn');
        voiceBtn.addEventListener('click', () => this.openVoicePanel());

        // Voice Panel Controls
        const voicePanel = document.getElementById('voicePanel');
        const voiceMinimized = document.getElementById('voiceMinimized');
        const hangupBtn = document.getElementById('hangupBtn');
        const subtitleToggle = document.getElementById('subtitleToggle');
        const microphoneToggle = document.getElementById('microphoneToggle');
        const interruptBtn = document.getElementById('interruptBtn');
        const minimizeBtn = document.getElementById('minimizeBtn');
        const expandBtn = document.getElementById('expandBtn');

        hangupBtn.addEventListener('click', () => this.closeVoicePanel());
        subtitleToggle.addEventListener('click', () => this.toggleSubtitles());
        microphoneToggle.addEventListener('click', () => this.toggleMicrophone());
        interruptBtn.addEventListener('click', () => this.interruptSpeech());
        minimizeBtn.addEventListener('click', () => this.minimizeVoicePanel());
        expandBtn.addEventListener('click', () => this.expandVoicePanel());
        
        // Click on minimized panel to expand
        voiceMinimized.addEventListener('click', () => this.expandVoicePanel());

        // Form interactions
        this.bindFormEvents();
        
        // Logo upload
        const logoPlaceholder = document.getElementById('logoPlaceholder');
        const uploadLogoBtn = document.getElementById('uploadLogoBtn');
        
        logoPlaceholder.addEventListener('click', () => this.uploadLogo());
        uploadLogoBtn.addEventListener('click', () => this.uploadLogo());

        // Document uploads
        const documentBoxes = document.querySelectorAll('.document-box');
        documentBoxes.forEach(box => {
            box.addEventListener('click', () => this.uploadDocument(box));
        });
    }

    bindFormEvents() {
        const form = document.getElementById('companyForm');
        const inputs = form.querySelectorAll('input, select');

        inputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateFormData(e.target.name, e.target.value);
            });

            input.addEventListener('input', (e) => {
                this.updateFormData(e.target.name, e.target.value);
            });
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
    }

    // Voice Recognition Setup
    setupVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.lang = 'es-ES';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateStatusIndicator('listening');
                this.updateSubtitle('Escuchando...');
            };

            this.recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (finalTranscript) {
                    this.handleUserInput(finalTranscript);
                } else if (interimTranscript) {
                    this.updateSubtitle(interimTranscript);
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.handleSpeechError(event.error);
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateStatusIndicator('idle');
            };
        } else {
            console.warn('Speech recognition not supported');
            this.showNotification('El reconocimiento de voz no está disponible en este navegador', 'warning');
        }
    }

    // Voice Synthesis Setup
    setupVoiceSynthesis() {
        if ('speechSynthesis' in window) {
            this.synthesis = window.speechSynthesis;
            
            // Get Spanish voice
            this.synthesis.onvoiceschanged = () => {
                const voices = this.synthesis.getVoices();
                this.spanishVoice = voices.find(voice => 
                    voice.lang.includes('es') || voice.lang.includes('ES')
                ) || voices[0];
            };
        } else {
            console.warn('Speech synthesis not supported');
        }
    }

    // Voice Panel Management
    openVoicePanel() {
        const panel = document.getElementById('voicePanel');
        const minimized = document.getElementById('voiceMinimized');
        
        panel.classList.add('active');
        panel.classList.add('fade-in');
        minimized.classList.remove('active');
        
        this.startConversation();
    }

    closeVoicePanel() {
        const panel = document.getElementById('voicePanel');
        const minimized = document.getElementById('voiceMinimized');
        
        panel.classList.remove('active');
        minimized.classList.add('active');
        
        this.stopListening();
        this.stopSpeaking();
        this.clearConversation();
    }

    minimizeVoicePanel() {
        const panel = document.getElementById('voicePanel');
        const minimized = document.getElementById('voiceMinimized');
        
        panel.classList.remove('active');
        minimized.classList.add('active');
    }

    expandVoicePanel() {
        const panel = document.getElementById('voicePanel');
        const minimized = document.getElementById('voiceMinimized');
        
        panel.classList.add('active');
        minimized.classList.remove('active');
    }

    // Welcome Banner Management
    closeWelcomeBanner() {
        const banner = document.getElementById('aiWelcomeBanner');
        const trigger = document.getElementById('voiceAssistantTrigger');
        
        banner.style.display = 'none';
        trigger.style.display = 'block';
    }

    startRegistrationProcess() {
        this.closeWelcomeBanner();
        this.openVoicePanel();
        this.startRegistrationFlow();
    }

    // Registration Flow Management
    startRegistrationFlow() {
        this.currentStep = 0;
        this.executeStep(this.registrationSteps[this.currentStep]);
    }

    executeStep(step) {
        switch (step) {
            case 'welcome':
                this.welcomeStep();
                break;
            case 'upload_and_extract':
                this.uploadAndExtractStep();
                break;
            case 'question_answers':
                this.questionAnswersStep();
                break;
            case 'summary_confirm':
                this.summaryConfirmStep();
                break;
        }
    }

    nextStep() {
        this.currentStep++;
        if (this.currentStep < this.registrationSteps.length) {
            this.executeStep(this.registrationSteps[this.currentStep]);
        }
    }

    // Registration Steps
    welcomeStep() {
        const welcomeMessage = `¡Hola! Soy tu asistente de voz y te ayudaré a completar el registro de tu empresa.

**Proceso en 3 pasos:**
1. Subir documentos y extraer información
2. Completar datos faltantes
3. Confirmar y llenar formulario

¿Comenzamos?`;

        this.addMessage('assistant', welcomeMessage);
        this.speak(welcomeMessage);
        
        // Auto advance to next step after speaking
        setTimeout(() => {
            this.nextStep();
        }, 8000); // Wait for speech to complete
    }

    uploadAndExtractStep() {
        const uploadMessage = `**Paso 1: Subir documentos**

Sube los documentos de tu empresa:
- Logo de la empresa
- DNI (frontal y posterior)
- Cámara de Comercio
- RUT
- Certificación bancaria
- Estados financieros
- Composición accionaria

Haz clic en "Extraer información" cuando hayas subido todos los documentos.`;
        
        this.addMessage('assistant', uploadMessage);
        this.speak(uploadMessage);
        
        // Highlight upload areas
        this.highlightElement('logoPlaceholder');
        this.highlightElement('document-grid');
        
        // Add a button to proceed to next step
        this.addProceedButton('Extraer información', () => {
            this.simulateExtraction();
        });
    }

    simulateExtraction() {
        const extractMessage = `He extraído información de tus documentos:
- Razón Social: Empresa ABC S.A
- NIT: 900123456-7
- Dirección: Calle 15 #23-45, Bogotá
- Teléfono: 324 347 8909

Ahora completemos la información faltante.`;
        
        this.addMessage('assistant', extractMessage);
        this.speak(extractMessage);
        
        // Simulate filling some fields
        setTimeout(() => {
            this.fillFormField('socialReason', 'Empresa ABC S.A');
            this.fillFormField('documentNumber', '900123456');
            this.fillFormField('address', 'Calle 15 #23-45, Bogotá');
            this.fillFormField('phone', '324 347 8909');
            
            setTimeout(() => {
                this.nextStep();
            }, 3000);
        }, 2000);
    }

    questionAnswersStep() {
        const questionMessage = `**Paso 2: Completar información**

Te haré algunas preguntas para completar los datos faltantes. Responde con tu voz.

¿En qué departamento se encuentra tu empresa?`;
        
        this.addMessage('assistant', questionMessage);
        this.speak(questionMessage);
        
        // Start asking questions
        this.askQuestions();
    }

    askQuestions() {
        const questions = [
            { field: 'department', question: '¿En qué departamento se encuentra tu empresa?' },
            { field: 'city', question: '¿En qué ciudad se encuentra tu empresa?' },
            { field: 'category', question: '¿A qué categoría pertenece tu empresa? (Restaurante, Comercio, Servicios)' },
            { field: 'economicActivity', question: '¿Cuál es la actividad económica principal de tu empresa?' },
            { field: 'ciiuCode', question: '¿Cuál es el código CIIU de tu empresa?' }
        ];

        this.currentQuestionIndex = 0;
        this.questionsList = questions;
        this.askNextQuestion();
    }

    askNextQuestion() {
        if (this.currentQuestionIndex < this.questionsList.length) {
            const currentQ = this.questionsList[this.currentQuestionIndex];
            const questionMessage = currentQ.question;
            
            this.addMessage('assistant', questionMessage);
            this.speak(questionMessage);
            
            // Highlight the field being asked about
            this.highlightElement(currentQ.field);
        } else {
            // All questions answered, move to next step
            this.nextStep();
        }
    }

    summaryConfirmStep() {
        const summaryMessage = `**Paso 3: Resumen y confirmación**

**📋 Información identificada de los documentos:**

**Información básica:**
• Razón Social: ${this.formData.socialReason || 'Empresa ABC S.A'}
• NIT: ${this.formData.documentNumber || '900123456-7'}

**Ubicación:**
• Departamento: ${this.formData.department || 'Cundinamarca'}
• Ciudad: ${this.formData.city || 'Bogotá'}
• Dirección: ${this.formData.address || 'Calle 15 #23-45, Bogotá'}

**Contacto:**
• Teléfono: ${this.formData.phone || '324 347 8909'}

**Actividad:**
• Categoría: ${this.formData.category || 'Restaurante'}
• Actividad Económica: ${this.formData.economicActivity || 'Restaurante de comida colombiana'}
• Código CIIU: ${this.formData.ciiuCode || 'Clase 7420'}

**Documentos procesados:**
• Logo de la empresa
• DNI (frontal y posterior)
• Cámara de Comercio
• RUT
• Certificación bancaria
• Estados financieros
• Composición accionaria

¿La información identificada es correcta? Confirma para aplicar automáticamente al formulario.`;
        
        this.addMessage('assistant', summaryMessage);
        this.speak(summaryMessage);
        
        // Add confirmation buttons
        this.addConfirmationButtons();
    }

    addConfirmationButtons() {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'confirmation-buttons';
        buttonContainer.innerHTML = `
            <button class="confirm-btn success" onclick="vioceBot.confirmAndFill()">
                <i class="fas fa-check"></i>
                Apply
            </button>
            <button class="confirm-btn secondary" onclick="vioceBot.reviewData()">
                <i class="fas fa-edit"></i>
                Modificar datos
            </button>
        `;
        
        const history = document.getElementById('conversationHistory');
        history.appendChild(buttonContainer);
    }

    confirmAndFill() {
        // Fill all form fields with collected data
        const fieldsToFill = {
            'socialReason': 'Empresa ABC S.A',
            'documentNumber': '900123456',
            'documentDigit': '7',
            'department': 'Cundinamarca',
            'city': 'Bogotá',
            'address': 'Calle 15 #23-45, Bogotá',
            'phone': '324 347 8909',
            'category': 'Restaurante',
            'economicActivity': 'Restaurante de comida colombiana',
            'ciiuCode': 'Clase 7420'
        };

        Object.entries(fieldsToFill).forEach(([field, value]) => {
            this.fillFormField(field, value);
        });

        const successMessage = `✅ **¡Información aplicada exitosamente!**

He aplicado automáticamente toda la información identificada al formulario:

• **Información básica**: Razón social, NIT
• **Ubicación**: Departamento, ciudad, dirección  
• **Contacto**: Teléfono
• **Actividad**: Categoría, actividad económica, código CIIU

**Próximo paso**: Revisa los datos en el formulario y haz clic en "Guardar" para completar el registro.

¡Gracias por usar nuestro asistente de voz! 🎉`;
        
        this.addMessage('assistant', successMessage);
        this.speak(successMessage);
        
        // Highlight the form
        this.highlightElement('companyForm');
    }

    reviewData() {
        const reviewMessage = `Entiendo que quieres revisar los datos. ¿Qué campo específico te gustaría modificar? Puedes decirme:

- "Cambiar razón social"
- "Modificar dirección" 
- "Actualizar teléfono"
- O cualquier otro campo que necesites ajustar.`;
        
        this.addMessage('assistant', reviewMessage);
        this.speak(reviewMessage);
    }

    // Helper methods for registration flow
    highlightElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add('highlight-area');
            setTimeout(() => {
                element.classList.remove('highlight-area');
            }, 3000);
        }
    }

    addProceedButton(text, callback) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'proceed-button-container';
        buttonContainer.innerHTML = `
            <button class="proceed-btn" onclick="vioceBot.executeProceedCallback()">
                <i class="fas fa-arrow-right"></i>
                ${text}
            </button>
        `;
        
        const history = document.getElementById('conversationHistory');
        history.appendChild(buttonContainer);
        
        // Store callback for execution
        this.currentProceedCallback = callback;
    }

    executeProceedCallback() {
        if (this.currentProceedCallback) {
            this.currentProceedCallback();
            this.currentProceedCallback = null;
        }
    }

    askForMissingInfo() {
        const missingFields = this.getMissingFields();
        if (missingFields.length > 0) {
            const field = missingFields[0];
            const question = this.getFieldQuestion(field);
            
            this.addMessage('assistant', question);
            this.speak(question);
            
            // Highlight the specific field
            this.highlightElement(field);
        } else {
            this.nextStep();
        }
    }

    getMissingFields() {
        const requiredFields = ['socialReason', 'city', 'department', 'address', 'phone', 'category'];
        return requiredFields.filter(field => !this.formData[field] || this.formData[field].trim() === '');
    }

    getFieldQuestion(fieldName) {
        const questions = {
            'socialReason': '¿Cuál es la razón social de tu empresa?',
            'city': '¿En qué ciudad se encuentra tu empresa?',
            'department': '¿En qué departamento se encuentra tu empresa?',
            'address': '¿Cuál es la dirección completa de tu empresa?',
            'phone': '¿Cuál es el número de teléfono de contacto?',
            'category': '¿A qué categoría pertenece tu empresa?'
        };
        return questions[fieldName] || 'Por favor, proporciona la información para este campo.';
    }

    showDataSummary() {
        const summary = this.generateDataSummary();
        this.addMessage('assistant', summary);
        this.speak('Aquí tienes un resumen de todos los datos. Por favor, revísalos y confirma que están correctos.');
    }

    generateDataSummary() {
        let summary = '**Resumen de Datos de la Empresa:**\n\n';
        
        const fields = {
            'socialReason': 'Razón Social',
            'city': 'Ciudad',
            'department': 'Departamento',
            'address': 'Dirección',
            'phone': 'Teléfono',
            'category': 'Categoría'
        };
        
        for (const [key, label] of Object.entries(fields)) {
            const value = this.formData[key] || 'No proporcionado';
            summary += `${label}: ${value}\n`;
        }
        
        summary += '\n¿Todos los datos están correctos?';
        return summary;
    }

    // Conversation Management
    startConversation() {
        // This is now handled by the registration flow
        this.startRegistrationFlow();
    }

    handleUserInput(text) {
        this.addMessage('user', text);
        this.updateSubtitle(text);
        
        // Process the input and generate response
        this.processUserInput(text);
    }

    async processUserInput(text) {
        this.showLoading(true);
        
        try {
            // Simulate AI processing
            await this.simulateAIProcessing();
            
            const response = this.generateAIResponse(text);
            this.addMessage('assistant', response);
            this.speak(response);
            
            // Check if we need to fill form fields
            this.extractAndFillFormData(text);
            
        } catch (error) {
            console.error('Error processing user input:', error);
            this.handleError('Error al procesar tu mensaje. Por favor, intenta de nuevo.');
        } finally {
            this.showLoading(false);
        }
    }

    generateAIResponse(userInput) {
        const input = userInput.toLowerCase();
        
        // Check if we're in the registration flow
        if (this.currentStep < this.registrationSteps.length) {
            const currentStep = this.registrationSteps[this.currentStep];
            
            if (currentStep === 'fill_missing') {
                // Handle missing field responses
                return this.handleMissingFieldResponse(input);
            } else if (currentStep === 'confirm_data') {
                // Handle confirmation responses
                return this.handleConfirmationResponse(input);
            }
        }
        
        // Fallback to general responses
        if (input.includes('nombre') || input.includes('razón social')) {
            return 'Por favor, dime el nombre completo de tu empresa o razón social.';
        } else if (input.includes('dirección') || input.includes('direccion')) {
            return 'Necesito la dirección completa de tu empresa. ¿Puedes proporcionármela?';
        } else if (input.includes('teléfono') || input.includes('telefono') || input.includes('celular')) {
            return '¿Cuál es tu número de teléfono o celular de contacto?';
        } else if (input.includes('ciudad') || input.includes('departamento')) {
            return '¿En qué ciudad y departamento se encuentra tu empresa?';
        } else if (input.includes('actividad') || input.includes('económica')) {
            return '¿Cuál es la actividad económica principal de tu empresa?';
        } else if (input.includes('documento') || input.includes('nit')) {
            return 'Necesito el número de documento de identificación de tu empresa.';
        } else if (input.includes('ayuda') || input.includes('ayudar')) {
            return 'Te ayudo a completar el formulario de registro. Puedes decirme los datos de tu empresa y los llenaré automáticamente.';
        } else {
            return 'Entiendo. ¿Puedes proporcionarme más detalles sobre lo que necesitas para el registro de tu empresa?';
        }
    }

    handleMissingFieldResponse(input) {
        // Check if we're in the question-answer step
        if (this.currentStep === 1 && this.questionsList && this.currentQuestionIndex < this.questionsList.length) {
            return this.handleQuestionResponse(input);
        }

        const missingFields = this.getMissingFields();
        if (missingFields.length === 0) {
            this.nextStep();
            return 'Perfecto, todos los campos están completos. Continuemos con el siguiente paso.';
        }

        const currentField = missingFields[0];
        
        // Extract information based on field type
        let extractedValue = '';
        
        switch (currentField) {
            case 'socialReason':
                if (input.includes('se llama') || input.includes('es')) {
                    const match = input.match(/(?:se llama|es)\s+(.+)/i);
                    extractedValue = match ? match[1].trim() : input;
                } else {
                    extractedValue = input;
                }
                break;
            case 'address':
                if (input.includes('dirección') || input.includes('direccion') || input.includes('es')) {
                    const match = input.match(/(?:dirección|direccion|es)\s+(.+)/i);
                    extractedValue = match ? match[1].trim() : input;
                } else {
                    extractedValue = input;
                }
                break;
            case 'phone':
                const phoneMatch = input.match(/(\d{3}\s*\d{3}\s*\d{4})/);
                extractedValue = phoneMatch ? phoneMatch[1] : input;
                break;
            default:
                extractedValue = input;
        }

        // Fill the field
        this.fillFormField(currentField, extractedValue);
        
        // Ask for next field or move to next step
        const remainingFields = this.getMissingFields();
        if (remainingFields.length > 0) {
            const nextField = remainingFields[0];
            const nextQuestion = this.getFieldQuestion(nextField);
            return `Perfecto, he guardado "${extractedValue}" para ${this.getFieldLabel(currentField)}. Ahora ${nextQuestion}`;
        } else {
            this.nextStep();
            return `Excelente, he completado todos los campos. Ahora vamos a revisar toda la información.`;
        }
    }

    handleQuestionResponse(input) {
        const currentQ = this.questionsList[this.currentQuestionIndex];
        let extractedValue = input;

        // Extract specific information based on field type
        switch (currentQ.field) {
            case 'department':
                if (input.includes('cundinamarca')) extractedValue = 'Cundinamarca';
                else if (input.includes('antioquia')) extractedValue = 'Antioquia';
                else if (input.includes('valle')) extractedValue = 'Valle del Cauca';
                break;
            case 'city':
                if (input.includes('bogotá') || input.includes('bogota')) extractedValue = 'Bogotá';
                else if (input.includes('medellín') || input.includes('medellin')) extractedValue = 'Medellín';
                else if (input.includes('cali')) extractedValue = 'Cali';
                break;
            case 'category':
                if (input.includes('restaurante')) extractedValue = 'Restaurante';
                else if (input.includes('comercio')) extractedValue = 'Comercio';
                else if (input.includes('servicios')) extractedValue = 'Servicios';
                break;
            case 'phone':
                const phoneMatch = input.match(/(\d{3}\s*\d{3}\s*\d{4})/);
                extractedValue = phoneMatch ? phoneMatch[1] : input;
                break;
        }

        // Store the answer
        this.formData[currentQ.field] = extractedValue;
        
        // Add user message
        this.addMessage('user', input);
        
        // Confirm the answer
        const confirmMessage = `✅ Guardado: "${extractedValue}"`;
        this.addMessage('assistant', confirmMessage);
        this.speak(confirmMessage);

        // Move to next question
        this.currentQuestionIndex++;
        
        setTimeout(() => {
            this.askNextQuestion();
        }, 2000);
        
        return confirmMessage;
    }

    handleConfirmationResponse(input) {
        if (input.includes('sí') || input.includes('si') || input.includes('correcto') || input.includes('bien') || input.includes('ok')) {
            this.nextStep();
            return '¡Perfecto! Todos los datos están confirmados. Ahora puedes proceder a guardar el formulario.';
        } else if (input.includes('no') || input.includes('incorrecto') || input.includes('cambiar')) {
            return 'Entiendo que necesitas hacer cambios. ¿Qué campo específico te gustaría modificar?';
        } else {
            return 'Por favor, confirma si todos los datos están correctos respondiendo "sí" o "no".';
        }
    }

    getFieldLabel(fieldName) {
        const labels = {
            'socialReason': 'la razón social',
            'city': 'la ciudad',
            'department': 'el departamento',
            'address': 'la dirección',
            'phone': 'el teléfono',
            'category': 'la categoría'
        };
        return labels[fieldName] || 'el campo';
    }

    extractAndFillFormData(text) {
        const input = text.toLowerCase();
        
        // Extract company name
        if (input.includes('mi empresa se llama') || input.includes('razón social')) {
            const match = text.match(/(?:mi empresa se llama|razón social)\s+(.+)/i);
            if (match) {
                this.fillFormField('socialReason', match[1].trim());
            }
        }
        
        // Extract address
        if (input.includes('dirección') || input.includes('direccion')) {
            const match = text.match(/(?:dirección|direccion)\s+(.+)/i);
            if (match) {
                this.fillFormField('address', match[1].trim());
            }
        }
        
        // Extract phone
        if (input.includes('teléfono') || input.includes('telefono') || input.includes('celular')) {
            const phoneMatch = text.match(/(\d{3}\s*\d{3}\s*\d{4})/);
            if (phoneMatch) {
                this.fillFormField('phone', phoneMatch[1]);
            }
        }
        
        // Extract document number
        if (input.includes('documento') || input.includes('nit')) {
            const docMatch = text.match(/(\d{10,11})/);
            if (docMatch) {
                this.fillFormField('documentNumber', docMatch[1]);
            }
        }
    }

    fillFormField(fieldName, value) {
        const field = document.querySelector(`[name="${fieldName}"]`);
        if (field) {
            field.value = value;
            field.classList.add('highlight');
            setTimeout(() => field.classList.remove('highlight'), 2000);
            
            this.updateFormData(fieldName, value);
            this.addMessage('assistant', `He llenado el campo "${fieldName}" con "${value}".`);
        }
    }

    // Voice Control Methods
    speak(text) {
        if (this.synthesis && this.spanishVoice) {
            this.stopSpeaking();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = this.spanishVoice;
            utterance.rate = 0.9;
            utterance.pitch = 1;
            
            utterance.onstart = () => {
                this.isSpeaking = true;
                this.updateStatusIndicator('speaking');
                this.showInterruptButton(true);
            };
            
            utterance.onend = () => {
                this.isSpeaking = false;
                this.updateStatusIndicator('idle');
                this.showInterruptButton(false);
            };
            
            this.synthesis.speak(utterance);
        }
    }

    stopSpeaking() {
        if (this.synthesis) {
            this.synthesis.cancel();
            this.isSpeaking = false;
            this.showInterruptButton(false);
        }
    }

    startListening() {
        if (this.recognition && this.microphoneEnabled) {
            this.recognition.start();
        }
    }

    stopListening() {
        if (this.recognition) {
            this.recognition.stop();
        }
    }

    // UI Control Methods
    toggleSubtitles() {
        this.subtitlesEnabled = !this.subtitlesEnabled;
        const btn = document.getElementById('subtitleToggle');
        const display = document.getElementById('subtitleDisplay');
        
        if (this.subtitlesEnabled) {
            btn.classList.add('active');
            display.style.display = 'flex';
        } else {
            btn.classList.remove('active');
            display.style.display = 'none';
        }
    }

    toggleMicrophone() {
        this.microphoneEnabled = !this.microphoneEnabled;
        const btn = document.getElementById('microphoneToggle');
        
        if (this.microphoneEnabled) {
            btn.classList.add('active');
            if (this.isListening) {
                this.startListening();
            }
        } else {
            btn.classList.remove('active');
            this.stopListening();
        }
    }

    interruptSpeech() {
        this.stopSpeaking();
        this.showInterruptButton(false);
    }

    updateStatusIndicator(status) {
        const indicator = document.getElementById('statusIndicator');
        const minimizedStatus = document.getElementById('minimizedStatus');
        
        indicator.className = `status-indicator ${status}`;
        if (minimizedStatus) {
            minimizedStatus.className = `minimized-status ${status}`;
        }
        
        // Update status text
        const statusText = indicator.querySelector('span');
        if (statusText) {
            switch (status) {
                case 'listening':
                    statusText.textContent = 'Escuchando...';
                    break;
                case 'speaking':
                    statusText.textContent = 'Hablando...';
                    break;
                default:
                    statusText.textContent = 'Conectado';
            }
        }
    }

    updateSubtitle(text) {
        if (this.subtitlesEnabled) {
            const subtitleText = document.getElementById('subtitleText');
            subtitleText.textContent = text;
        }
    }

    showInterruptButton(show) {
        const interruptBtn = document.getElementById('interruptBtn');
        interruptBtn.style.display = show ? 'flex' : 'none';
    }

    // Message Management
    addMessage(role, content) {
        const history = document.getElementById('conversationHistory');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message fade-in`;
        
        const timestamp = new Date().toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        messageDiv.innerHTML = `
            <div class="message-content">${content}</div>
            <div class="message-time">${timestamp}</div>
        `;
        
        history.appendChild(messageDiv);
        history.scrollTop = history.scrollHeight;
        
        this.conversationHistory.push({ role, content, timestamp });
    }



    clearConversation() {
        const history = document.getElementById('conversationHistory');
        history.innerHTML = '';
        this.conversationHistory = [];
    }

    // Form Management
    updateFormData(fieldName, value) {
        this.formData[fieldName] = value;
        console.log('Form data updated:', this.formData);
    }

    loadFormData() {
        const form = document.getElementById('companyForm');
        const inputs = form.querySelectorAll('input, select');
        
        inputs.forEach(input => {
            if (input.value) {
                this.formData[input.name] = input.value;
            }
        });
    }

    handleFormSubmit() {
        this.showNotification('Formulario enviado correctamente', 'success');
        console.log('Form submitted:', this.formData);
    }

    // File Upload Methods
    uploadLogo() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleLogoUpload(file);
            }
        };
        
        input.click();
    }

    handleLogoUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const logoPlaceholder = document.getElementById('logoPlaceholder');
            logoPlaceholder.innerHTML = `<img src="${e.target.result}" alt="Logo" style="width: 100%; height: 100%; object-fit: cover; border-radius: 8px;">`;
            this.showNotification('Logo cargado correctamente', 'success');
        };
        reader.readAsDataURL(file);
    }

    uploadDocument(box) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleDocumentUpload(file, box);
            }
        };
        
        input.click();
    }

    handleDocumentUpload(file, box) {
        if (file.size > 8 * 1024 * 1024) {
            this.showNotification('El archivo es demasiado grande. Máximo 8MB.', 'error');
            return;
        }
        
        if (!file.type.includes('pdf')) {
            this.showNotification('Solo se permiten archivos PDF.', 'error');
            return;
        }
        
        box.innerHTML = `
            <i class="fas fa-check-circle" style="color: #52C41A;"></i>
            <span>${file.name}</span>
        `;
        box.style.borderColor = '#52C41A';
        this.showNotification('Documento cargado correctamente', 'success');
    }

    // Utility Methods
    async simulateAIProcessing() {
        return new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
        notification.innerHTML = `
            <i class="fas fa-${this.getNotificationIcon(type)}"></i>
            <span>${message}</span>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${this.getNotificationColor(type)};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 4000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            max-width: 300px;
            font-size: 14px;
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    getNotificationColor(type) {
        const colors = {
            success: '#52C41A',
            error: '#FF4D4F',
            warning: '#FAAD14',
            info: '#007ACC'
        };
        return colors[type] || '#007ACC';
    }

    handleSpeechError(error) {
        let message = 'Error en el reconocimiento de voz';
        
        switch (error) {
            case 'no-speech':
                message = 'No se detectó voz. Por favor, habla más cerca del micrófono.';
                break;
            case 'audio-capture':
                message = 'Error al capturar audio. Verifica tu micrófono.';
                break;
            case 'not-allowed':
                message = 'Permiso denegado para usar el micrófono.';
                break;
            case 'network':
                message = 'Error de red. Verifica tu conexión.';
                break;
        }
        
        this.showNotification(message, 'error');
    }

    handleError(message) {
        this.showNotification(message, 'error');
    }
}

// Initialize the VioceBot when the page loads
let vioceBot;

document.addEventListener('DOMContentLoaded', () => {
    vioceBot = new ClaroVioceBot();
});

// Add CSS for form field highlighting
const style = document.createElement('style');
style.textContent = `
    .highlight {
        animation: highlightField 2s ease-in-out;
    }
    
    @keyframes highlightField {
        0%, 100% { background-color: transparent; }
        50% { background-color: rgba(223, 42, 63, 0.1); }
    }
    
    .notification {
        animation: slideInRight 0.3s ease-out;
    }
    
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style); 