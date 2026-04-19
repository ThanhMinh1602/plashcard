# 📱 Hướng Dẫn Test Trên Mobile/Tablet

## 🚀 Cách 1: Test Trên Local Network (Đơn giản nhất)

### Bước 1: Chạy Dev Server với Host
```bash
cd c:\ThanhMinh\flashcard\flashcard-demo
npm run dev -- --host
```

### Bước 2: Kiểm tra IP Address
Output sẽ hiển thị:
```
Local:   http://localhost:5174/
Network: http://192.168.1.x:5174/  ← Copy IP này
```

### Bước 3: Truy Cập từ Điện Thoại/Tablet
1. Đảm bảo điện thoại và máy tính **cùng WiFi**
2. Mở browser trên điện thoại
3. Nhập: `http://192.168.1.x:5174/` (thay x bằng số thực)
4. Enter → App sẽ load

## 🧪 Cách 2: Chrome DevTools Emulator (Nhanh cho test)

### Bước 1: Mở DevTools
- Nhấn F12 trong Chrome

### Bước 2: Toggle Device Mode
- Nhấn Ctrl+Shift+M (hoặc Cmd+Shift+M trên Mac)
- Hoặc click: ⋮ → More tools → Device emulation

### Bước 3: Chọn Device
- Click vào "Responsive" dropdown
- Chọn "iPhone 12", "iPad", "Pixel 6", etc.
- Hoặc tự set kích thước: 320×568 (mobile), 768×1024 (tablet)

### Bước 4: Test
- Dùng mouse để vẽ (giả lập touch)
- Test landscape/portrait (Ctrl+Shift+M → rotate icon)

## 🎯 What to Test on Mobile

### Functionality
- [ ] Login/Register hoạt động
- [ ] Canvas vẽ được
- [ ] Tools có thể chọn
- [ ] Colors có thể change
- [ ] Sliders hoạt động
- [ ] Buttons có thể tap

### Layout
- [ ] Không có horizontal scroll
- [ ] Header hiển thị đúng
- [ ] Flashcard responsive
- [ ] Toolbar fit screen
- [ ] Portrait + landscape OK

### Performance
- [ ] Drawing smooth (không lag)
- [ ] Buttons responsive
- [ ] No console errors
- [ ] Firebase requests OK

## 💡 Pro Tips

### Nếu nhập IP không được:
1. Kiểm tra firewall:
   ```bash
   # Windows:
   netsh advfirewall firewall add rule name="Vite Dev Server" dir=in action=allow program="node.exe" enable=yes
   ```

2. Hoặc disable firewall tạm thời:
   - Settings → Firewall → Allow app through

### Nếu muốn test HTTPS:
```bash
# Cần cài mkcert trước
npm run dev -- --host --https
```

### Nếu muốn expose từ xa (VPS, ngrok):
```bash
# Dùng ngrok (miễn phí)
npm install -g ngrok

# Tạo tunnel
ngrok http 5174

# Sẽ được URL:
# https://xxx-yyy.ngrok.io
```

## 📊 Responsive Breakpoints

App support các kích thước:
- **Mobile**: < 480px (iPhone 5-13 mini)
- **Tablet**: 481px - 768px (iPad mini, tablet nhỏ)
- **Tablet Large**: > 768px (iPad Pro)

## 🔍 Debug Mobile Issues

### 1. Inspect Elements trên Device Thật
```
iPhone:
- Safari → Settings → Advanced → Web Inspector → Enable
- Mở DevTools: Desktop Safari → Develop → [Your Device]

Android:
- Enable USB Debug
- Chrome → chrome://inspect
```

### 2. Log to Console
```javascript
console.log('Test mobile:', window.innerWidth);
```

### 3. Check Network
- DevTools Network tab → see Firebase latency
- 4G Slow có lag không?

## 🎨 CSS Media Queries Test

### Desktop (> 768px)
- Full-size buttons
- Sidebar có thể
- Large fonts

### Tablet (481-768px)
- Medium buttons
- Flexible layout
- Adjusted fonts

### Mobile (< 480px)
- Touch-size buttons (44px min)
- Single column
- Small fonts
- Optimize spacing

## 📸 Screenshot Testing

Để compare layouts:
```bash
# Chrome DevTools → Capture Screenshot
# Hoặc Capture Full Page
```

## 🚀 Deploy & Share

Muốn chia sẻ với người khác để test:

### Option 1: Firebase Hosting
```bash
npm run build
firebase deploy
# Sẽ được public URL
```

### Option 2: Vercel
```bash
npm install -g vercel
vercel
# Auto deploy + get URL
```

### Option 3: ngrok (5 phút setup)
```bash
npm run dev -- --host
# Terminal khác:
ngrok http 5174
# Share ngrok URL
```

## ✅ Testing Checklist

### Desktop
- [ ] Works on Chrome
- [ ] Works on Firefox
- [ ] Works on Safari

### Mobile
- [ ] Works on iPhone Safari
- [ ] Works on Android Chrome
- [ ] Works on Samsung Internet

### Tablet
- [ ] Works on iPad
- [ ] Landscape mode OK
- [ ] Touch responsiveness good

### Features
- [ ] Drawing smooth
- [ ] No lag
- [ ] Buttons accessible
- [ ] No scroll issues
- [ ] Firebase sync OK

## 📞 Common Issues

### "Cannot connect to 192.168.1.x"
→ Check firewall, try disabling temporarily

### "Buttons too small on mobile"
→ We set min 44px, should be fine
→ If not, report the issue

### "Drawing lag on mobile"
→ May be performance issue
→ Test on different device
→ Check Firebase latency

### "Page zoom weird"
→ Viewport meta tag đã set
→ Disable auto-zoom: input font-size 16px

## 🎓 Learn More

- MDN: [Responsive Design](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design)
- Chrome DevTools: [Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- Touch Events: [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events)

---

**Happy Testing! 🎉**

Nếu gặp vấn đề, check file `MOBILE_SUPPORT.md` để hiểu chi tiết hơn.
