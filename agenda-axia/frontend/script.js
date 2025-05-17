document.addEventListener('DOMContentLoaded', function () {
    // Elementos do DOM
    const calendarEl = document.getElementById('calendar');
    const currentMonthEl = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const appointmentForm = document.getElementById('appointment-form');
    const appointmentDateEl = document.getElementById('appointment-date');
    const startTimeEl = document.getElementById('start-time');
    const endTimeEl = document.getElementById('end-time');
    const currentYearEl = document.getElementById('current-year');

    // Variáveis de estado
    let currentDate = new Date();
    let selectedDate = null;
    let bookedDates = JSON.parse(localStorage.getItem('bookedDates')) || [];

    // Inicialização
    updateCurrentYear();
    generateTimeOptions();
    renderCalendar();

    // Event Listeners
    prevMonthBtn.addEventListener('click', goToPreviousMonth);
    nextMonthBtn.addEventListener('click', goToNextMonth);
    appointmentForm.addEventListener('submit', handleFormSubmit);

    // Funções
    function updateCurrentYear() {
        currentYearEl.textContent = new Date().getFullYear();
    }

    function generateTimeOptions() {
        const options = [];
        for (let hour = 9; hour <= 17; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
                options.push(`<option value="${timeString}">${timeString}</option>`);
            }
        }

        startTimeEl.innerHTML = '<option value="">Selecione...</option>' + options.join('');
        endTimeEl.innerHTML = '<option value="">Selecione...</option>' + options.join('');
    }

    function renderCalendar() {

        calendarEl.innerHTML = '';


        const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        daysOfWeek.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'day-header';
            dayHeader.textContent = day;
            calendarEl.appendChild(dayHeader);
        });


        currentMonthEl.textContent = new Intl.DateTimeFormat('pt-BR', {
            month: 'long',
            year: 'numeric'
        }).format(currentDate).replace(/de /g, '').replace(/ /g, ' ');


        const firstDayOfMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            1
        );


        const lastDayOfMonth = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0
        );


        const startingDayOfWeek = firstDayOfMonth.getDay();


        const endingDayOfWeek = lastDayOfMonth.getDay();


        const totalDays = lastDayOfMonth.getDate() + startingDayOfWeek + (6 - endingDayOfWeek);


        const today = new Date();
        const isCurrentMonth = today.getFullYear() === currentDate.getFullYear() &&
            today.getMonth() === currentDate.getMonth();


        for (let i = 0; i < totalDays; i++) {
            const dayEl = document.createElement('div');
            dayEl.className = 'day';

            // Dias do mês anterior
            if (i < startingDayOfWeek) {
                const prevMonthDay = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    0 - (startingDayOfWeek - i - 1)
                );

                dayEl.classList.add('disabled');
                dayEl.innerHTML = `<span class="day-number">${prevMonthDay.getDate()}</span>`;
                calendarEl.appendChild(dayEl);
                continue;
            }

            // Dias do mês atual
            const dayNumber = i - startingDayOfWeek + 1;
            if (dayNumber <= lastDayOfMonth.getDate()) {
                const date = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth(),
                    dayNumber
                );

                const dateString = formatDate(date);
                const isBooked = bookedDates.includes(dateString);
                const isToday = isCurrentMonth && dayNumber === today.getDate();

                if (isToday) dayEl.classList.add('today');
                if (isBooked) dayEl.classList.add('booked');

                dayEl.innerHTML = `<span class="day-number">${dayNumber}</span>`;
                dayEl.dataset.date = dateString;

                dayEl.addEventListener('click', () => selectDate(dayEl, date, dateString, isBooked));
                calendarEl.appendChild(dayEl);
                continue;
            }

            // Dias do próximo mês
            const nextMonthDay = new Date(
                currentDate.getFullYear(),
                currentDate.getMonth() + 1,
                dayNumber - lastDayOfMonth.getDate()
            );

            dayEl.classList.add('disabled');
            dayEl.innerHTML = `<span class="day-number">${nextMonthDay.getDate()}</span>`;
            calendarEl.appendChild(dayEl);
        }
    }

    function selectDate(dayEl, date, dateString, isBooked) {
        if (isBooked) return;

        // Remove a seleção anterior
        const previouslySelected = document.querySelector('.day.selected');
        if (previouslySelected) {
            previouslySelected.classList.remove('selected');
        }

        // Adiciona a nova seleção
        dayEl.classList.add('selected');
        selectedDate = date;
        appointmentDateEl.value = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(date).replace(/feira/g, '').replace(/\./g, '');
    }

    function goToPreviousMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() - 1,
            1
        );
        renderCalendar();
    }

    function goToNextMonth() {
        currentDate = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            1
        );
        renderCalendar();
    }

    async function handleFormSubmit(e) {
        e.preventDefault();

        if (!selectedDate) {
            alert('Por favor, selecione uma data.');
            return;
        }

        const formData = {
            date: formatDate(selectedDate),
            start: startTimeEl.value,
            end: endTimeEl.value,
            client: document.getElementById('client-name').value.trim(),
            location: document.getElementById('location').value.trim(),
            service: document.getElementById('service-type').value
        };

        // Validações básicas
        if (!formData.client || !formData.start || !formData.end || !formData.location || !formData.service) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        try {
            // 1. Tenta reservar no servidor
            const response = await fetch('http://localhost:3001/api/book-appointment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao agendar');
            }

            // 2. Se reservado com sucesso, redireciona para WhatsApp
            const whatsappMessage = `Olá AXIA IMÓVEIS, confirmo meu agendamento:%0A%0A` +
                `📅 Data: ${appointmentDateEl.value}%0A` +
                `⏰ Horário: ${formData.start} às ${formData.end}%0A` +
                `📍 Local: ${formData.location}%0A` +
                `📸 Serviço: ${formData.service}%0A` +
                `👤 Cliente: ${formData.client}%0A` +
                `%0APor favor, confirmem recebimento.`;

            window.open(`https://wa.me/5581985546267?text=${whatsappMessage}`, '_blank');

            // 3. Limpa o formulário
            appointmentForm.reset();
            appointmentDateEl.value = '';
            selectedDate = null;

            // 4. Atualiza calendário
            await updateCalendar();

        } catch (error) {
            alert(error.message);
        }
    }

    async function updateCalendar() {
        // Busca slots disponíveis do servidor
        const dateStr = selectedDate ? formatDate(selectedDate) : '';
        const response = await fetch(`http://localhost:3001/api/available-slots?date=${dateStr}`);
        const availableSlots = await response.json();

        // Atualiza a UI conforme os slots disponíveis
        // (Implemente esta lógica conforme sua interface)
    }
});